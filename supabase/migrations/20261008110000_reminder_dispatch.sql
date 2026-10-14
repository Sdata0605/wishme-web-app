-- Firing reminders.
--
-- A phone with the app closed cannot ring itself reliably, and it certainly cannot place a call,
-- so the server decides when a reminder is due. Claiming is done in SQL rather than in the worker
-- because two workers can overlap: `for update skip locked` plus setting fired_at in the same
-- statement means a reminder can only ever be claimed once.

-- Reminders whose moment has arrived (allowing for lead_minutes), now marked as fired.
create or replace function public.claim_due_reminders(p_limit integer default 50)
returns setof public.reminders
language sql
security definer
set search_path = 'public'
as $$
  update public.reminders r
  set fired_at = now(), updated_at = now()
  where r.id in (
    select id from public.reminders
    where status = 'pending'
      and fired_at is null
      and due_at is not null
      and due_at - make_interval(mins => lead_minutes) <= now()
      -- Something scheduled long ago and missed should not suddenly ring days later.
      and due_at > now() - interval '6 hours'
    order by due_at
    limit p_limit
    for update skip locked
  )
  returning r.*;
$$;

-- Reminders that were delivered, asked to escalate, and have gone unacknowledged long enough.
create or replace function public.claim_reminder_escalations(p_limit integer default 20)
returns setof public.reminders
language sql
security definer
set search_path = 'public'
as $$
  update public.reminders r
  set call_id = null, updated_at = now()
  where r.id in (
    select id from public.reminders
    where status = 'pending'
      and escalate
      and fired_at is not null
      and acknowledged_at is null
      and call_id is null
      and fired_at + make_interval(mins => escalate_after_minutes) <= now()
    order by fired_at
    limit p_limit
    for update skip locked
  )
  returning r.*;
$$;

revoke execute on function public.claim_due_reminders(integer) from anon, authenticated;
revoke execute on function public.claim_reminder_escalations(integer) from anon, authenticated;

-- ─── The heartbeat ──────────────────────────────────────────────────────────
-- Every minute, because a reminder set for 9:00 should not arrive at 9:05.

create or replace function public.cron_dispatch_reminders()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_url text := 'https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/reminders-dispatch';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
begin
  -- Skip the round trip entirely when there is nothing waiting.
  if not exists (
    select 1 from public.reminders
    where status = 'pending'
      and (
        (fired_at is null and due_at is not null and due_at - make_interval(mins => lead_minutes) <= now())
        or (escalate and fired_at is not null and acknowledged_at is null and call_id is null
            and fired_at + make_interval(mins => escalate_after_minutes) <= now())
      )
  ) then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
    body := '{}'::jsonb
  );
end;
$$;

select cron.unschedule('dispatch-reminders') where exists (select 1 from cron.job where jobname = 'dispatch-reminders');
select cron.schedule('dispatch-reminders', '* * * * *', $$select public.cron_dispatch_reminders()$$);

-- ─── Tidying up ─────────────────────────────────────────────────────────────
-- Recordings expire; the written conversation is kept forever because it costs almost nothing.

create or replace function public.cron_expire_call_recordings()
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_url text := 'https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/ai-call-recording/expire';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
begin
  if not exists (select 1 from public.ai_calls where recording_url is not null and recording_expires_at < now()) then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon_key),
    body := '{}'::jsonb
  );
end;
$$;

select cron.unschedule('expire-call-recordings') where exists (select 1 from cron.job where jobname = 'expire-call-recordings');
select cron.schedule('expire-call-recordings', '20 3 * * *', $$select public.cron_expire_call_recordings()$$);
