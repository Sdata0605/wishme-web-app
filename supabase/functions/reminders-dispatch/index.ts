/**
 * reminders-dispatch — fires reminders that are due.
 *
 * Woken once a minute by pg_cron (only when something is actually waiting). Claiming happens in
 * SQL, so two overlapping runs can never fire the same reminder twice.
 *
 * A reminder either pushes a notification to the user's phone, or rings them. If it asked to
 * escalate and nobody acknowledged it, it rings them afterwards as well.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { callToken, placeVobizCall, vobizConfig } from '../_shared/vobiz.ts';
import { checkPhoneNumber, cleanText } from '../_shared/aiCall.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  delivery: 'notification' | 'call';
  style: 'alarm' | 'reminder' | 'quiet';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_until: string | null;
  escalate: boolean;
  escalate_phone: string | null;
  lead_minutes: number;
  timezone: string;
  event_id: string | null;
}

const db = (): SupabaseClient => createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// ─── Reaching the phone ──────────────────────────────────────────────────────

/** A phone seen this recently has already scheduled the reminder itself. */
const DEVICE_FRESH_MS = 3 * 86_400_000;

/**
 * Pushes to every device this user has registered. Dead tokens are dropped as Expo reports them.
 *
 * This is a backstop, not the main route. The phone schedules its own notification, which is exact
 * and works with no signal — pushing as well would simply show the same reminder twice. So a phone
 * that has opened the app recently is left alone, and only a stale one (reinstalled, or offline
 * for days, and therefore holding no schedule) is pushed to.
 */
async function pushToUser(client: SupabaseClient, reminder: Reminder) {
  const { data: tokens } = await client
    .from('push_tokens')
    .select('token, last_seen_at')
    .eq('user_id', reminder.user_id);
  if (!tokens?.length) return false;

  const stale = tokens.filter(
    (t: { last_seen_at: string }) => Date.now() - new Date(t.last_seen_at).getTime() > DEVICE_FRESH_MS,
  );
  if (!stale.length) return true; // the phone has it covered

  // "Quiet" should not make a noise; an alarm should cut through a silent phone.
  const quiet = reminder.style === 'quiet';
  const messages = stale.map((t: { token: string }) => ({
    to: t.token,
    title: reminder.title,
    body: reminder.notes ?? (reminder.due_at ? 'Reminder' : ''),
    sound: quiet ? null : 'default',
    priority: reminder.style === 'alarm' ? 'high' : 'default',
    channelId: reminder.style === 'alarm' ? 'alarms' : 'reminders',
    categoryId: 'reminder',
    data: { kind: 'reminder', reminderId: reminder.id, eventId: reminder.event_id },
  }));

  try {
    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    const results: { status?: string; details?: { error?: string } }[] = body.data ?? [];
    const dead = stale
      .filter((_: unknown, i: number) => results[i]?.status === 'error' && results[i]?.details?.error === 'DeviceNotRegistered')
      .map((t: { token: string }) => t.token);
    if (dead.length) await client.from('push_tokens').delete().in('token', dead);
    return results.some((r) => r?.status === 'ok');
  } catch (e) {
    console.error('[reminders-dispatch] push failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Rings the user's own phone and has the assistant read the reminder out. */
async function callUser(client: SupabaseClient, reminder: Reminder, why: 'due' | 'escalation') {
  const vobiz = vobizConfig();
  if (!vobiz) {
    console.error('[reminders-dispatch] no phone service configured');
    return;
  }

  const { data: profile } = await client
    .from('profiles')
    .select('phone, first_name')
    .eq('user_id', reminder.user_id)
    .maybeSingle();

  const raw = reminder.escalate_phone || profile?.phone || '';
  const number = checkPhoneNumber(raw);
  if (!number.ok) {
    console.error(`[reminders-dispatch] reminder ${reminder.id.slice(0, 8)}: no usable number (${number.reason})`);
    return;
  }

  const name = profile?.first_name ? cleanText(profile.first_name, 40) : '';
  const purpose = why === 'escalation'
    ? `This is a reminder call for ${name || 'the user'}. They did not respond to the notification, so read this reminder out: "${reminder.title}". ${reminder.notes ? `Details: ${reminder.notes}.` : ''} Ask if they have done it, keep it to a few seconds, and say goodbye.`
    : `This is a reminder call for ${name || 'the user'}. Read this reminder out: "${reminder.title}". ${reminder.notes ? `Details: ${reminder.notes}.` : ''} Keep it to a few seconds, confirm they heard it, and say goodbye.`;

  const { data: row, error } = await client
    .from('ai_calls')
    .insert({
      user_id: reminder.user_id,
      to_name: name || null,
      to_phone: number.e164,
      // The person being called is the user themselves, so the AI is talking to its own owner.
      purpose: cleanText(purpose, 600),
      language: 'english',
      status: 'queued',
    })
    .select('id')
    .single();
  if (error || !row) {
    console.error('[reminders-dispatch] could not create the call row:', error?.message);
    return;
  }

  const token = await callToken(row.id);
  const at = (action: string) => `${SUPABASE_URL}/functions/v1/vobiz-call/${action}?id=${row.id}&t=${token}`;
  try {
    const placed = await placeVobizCall(vobiz, {
      to: number.e164,
      answerUrl: at('answer'),
      ringUrl: at('ring'),
      hangupUrl: at('hangup'),
      timeLimitSeconds: 180,
    });
    await client.from('ai_calls').update({ vapi_call_id: placed.id }).eq('id', row.id);
    await client.from('reminders').update({ call_id: row.id, updated_at: new Date().toISOString() }).eq('id', reminder.id);
    console.log(`[reminders-dispatch] ${reminder.id.slice(0, 8)} calling ${number.e164.slice(0, 5)}…`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[reminders-dispatch] call failed: ${message}`);
    await client.from('ai_calls').update({ status: 'failed', error_message: message.slice(0, 300) }).eq('id', row.id);
  }
}

// ─── Repeats ─────────────────────────────────────────────────────────────────

/** The same reminder, one period later. Null when it does not repeat, or has run out. */
function nextOccurrence(reminder: Reminder): string | null {
  if (reminder.recurrence === 'none' || !reminder.due_at) return null;
  const d = new Date(reminder.due_at);
  switch (reminder.recurrence) {
    case 'daily': d.setUTCDate(d.getUTCDate() + 1); break;
    case 'weekly': d.setUTCDate(d.getUTCDate() + 7); break;
    case 'monthly': d.setUTCMonth(d.getUTCMonth() + 1); break;
    case 'yearly': d.setUTCFullYear(d.getUTCFullYear() + 1); break;
  }
  if (reminder.recurrence_until && d > new Date(`${reminder.recurrence_until}T23:59:59Z`)) return null;
  return d.toISOString();
}

// ─── The run ─────────────────────────────────────────────────────────────────

serve(async () => {
  const client = db();
  const { data: enabled } = await client.from('platform_settings').select('setting_value').eq('setting_key', 'reminders_enabled').maybeSingle();
  if ((enabled?.setting_value ?? 'true') === 'false') return new Response(JSON.stringify({ skipped: 'reminders are switched off' }));

  const { data: callsAllowedRow } = await client.from('platform_settings').select('setting_value').eq('setting_key', 'reminder_call_enabled').maybeSingle();
  const callsAllowed = (callsAllowedRow?.setting_value ?? 'true') !== 'false';

  const { data: due, error } = await client.rpc('claim_due_reminders', { p_limit: 50 });
  if (error) console.error('[reminders-dispatch] could not claim reminders:', error.message);

  let delivered = 0;
  for (const reminder of (due ?? []) as Reminder[]) {
    if (reminder.delivery === 'call' && callsAllowed) await callUser(client, reminder, 'due');
    else await pushToUser(client, reminder);
    delivered++;

    // A repeating reminder becomes the next one in the series once this one has gone out.
    const next = nextOccurrence(reminder);
    if (next) {
      await client.from('reminders').insert({
        user_id: reminder.user_id,
        title: reminder.title,
        notes: reminder.notes,
        due_at: next,
        timezone: reminder.timezone,
        lead_minutes: reminder.lead_minutes,
        delivery: reminder.delivery,
        style: reminder.style,
        recurrence: reminder.recurrence,
        recurrence_until: reminder.recurrence_until,
        escalate: reminder.escalate,
        escalate_phone: reminder.escalate_phone,
        event_id: reminder.event_id,
      });
      await client.from('reminders').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', reminder.id);
    }
  }

  // Nobody responded to the nudge, and they asked to be rung if that happened.
  let escalated = 0;
  if (callsAllowed) {
    const { data: stale } = await client.rpc('claim_reminder_escalations', { p_limit: 20 });
    for (const reminder of (stale ?? []) as Reminder[]) {
      await callUser(client, reminder, 'escalation');
      escalated++;
    }
  }

  if (delivered || escalated) console.log(`[reminders-dispatch] delivered ${delivered}, escalated ${escalated}`);
  return new Response(JSON.stringify({ delivered, escalated }), { headers: { 'Content-Type': 'application/json' } });
});
