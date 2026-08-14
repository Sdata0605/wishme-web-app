import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── VARIABLE REPLACEMENT ────────────────────────────────────────────
function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

// ─── EMAIL VIA RESEND ────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  try {
    // Wrap plain text in styled HTML email template
    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Inter','Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#0f0d1a;color:#f1f0f3;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#F97316,#EC4899,#8B5CF6);padding:3px;border-radius:16px 16px 0 0;">
    <div style="background:#1a1625;padding:32px;border-radius:14px 14px 0 0;text-align:center;">
      <h1 style="color:#f1f0f3;margin:0;font-size:22px;font-weight:700;">${subject}</h1>
      <p style="color:#9b95a8;margin:8px 0 0;font-size:13px;">From Wish Me with love 💝</p>
    </div>
  </div>
  <div style="background:#1a1625;padding:32px;border:1px solid #2a2540;border-top:none;">
    <div style="color:#d1cde0;font-size:14px;line-height:1.8;white-space:pre-line;">${body}</div>
  </div>
  <div style="background:#1a1625;padding:20px 32px;border:1px solid #2a2540;border-top:none;border-radius:0 0 16px 16px;text-align:center;">
    <p style="color:#4a4460;font-size:11px;margin:0;">© ${new Date().getFullYear()} Wish Me · <a href="https://wishme.today" style="color:#8B5CF6;text-decoration:none;">wishme.today</a></p>
  </div>
</div>
</body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Wish Me <noreply@wishme.today>",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return { success: false, error: errText };
    }
    const data = await res.json();
    return { success: true, messageId: data?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── SMS VIA MSG91 ───────────────────────────────────────────────────
async function sendSMS(to: string, body: string, flowId?: string): Promise<{ success: boolean; error?: string }> {
  const authKey = Deno.env.get("MSG91_AUTH_KEY");
  const senderId = Deno.env.get("MSG91_SENDER_ID");

  if (!authKey) return { success: false, error: "MSG91_AUTH_KEY not configured — SMS skipped" };

  // Clean phone
  let phone = to.replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;
  if (!phone.startsWith("91")) phone = "91" + phone;

  try {
    if (flowId) {
      // Use MSG91 flow/template API
      const res = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: authKey, "Content-Type": "application/json" },
        body: JSON.stringify({ flow_id: flowId, sender: senderId || "WISHME", mobiles: phone }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: errText };
      }
      return { success: true };
    } else {
      // Use MSG91 send SMS API (text mode)
      const res = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: authKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          flow_id: "default",
          sender: senderId || "WISHME",
          mobiles: phone,
          SMS: body,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `MSG91 error: ${errText}` };
      }
      return { success: true };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── WHATSAPP VIA META ───────────────────────────────────────────────
async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return { success: false, error: "WhatsApp credentials not configured — skipped" };

  let phone = to.replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body } }),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Check for expired token
      if (res.status === 401) {
        console.error("WhatsApp token expired. Update WHATSAPP_ACCESS_TOKEN in Supabase secrets.");
      }
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { event_key, recipient_type, recipient_id, data: vars = {} } = await req.json();

    if (!event_key) {
      return new Response(JSON.stringify({ error: "event_key is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-wishme-notification] event=${event_key} recipient_type=${recipient_type} recipient_id=${recipient_id}`);

    // 1. Check if event exists and is enabled
    const { data: eventRow } = await supabase
      .from("message_events")
      .select("*")
      .eq("event_key", event_key)
      .eq("is_enabled", true)
      .maybeSingle();

    if (!eventRow) {
      console.log(`Event ${event_key} not found or disabled — skipping`);
      return new Response(JSON.stringify({ skipped: true, reason: "event_disabled_or_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check master channel toggles
    const { data: globalSettings } = await supabase
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["email_global_enabled", "sms_global_enabled", "whatsapp_global_enabled"]);

    const globals: Record<string, boolean> = { email: true, sms: false, whatsapp: true };
    globalSettings?.forEach((s: any) => {
      if (s.setting_key === "email_global_enabled") globals.email = s.setting_value === "true";
      if (s.setting_key === "sms_global_enabled") globals.sms = s.setting_value === "true";
      if (s.setting_key === "whatsapp_global_enabled") globals.whatsapp = s.setting_value === "true";
    });

    const emailEnabled = globals.email && eventRow.email_enabled;
    const smsEnabled = globals.sms && eventRow.sms_enabled;
    const whatsappEnabled = globals.whatsapp && eventRow.whatsapp_enabled;

    if (!emailEnabled && !smsEnabled && !whatsappEnabled) {
      console.log(`All channels disabled for ${event_key} — skipping`);
      return new Response(JSON.stringify({ skipped: true, reason: "all_channels_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Resolve recipient(s)
    type Recipient = { email?: string; phone?: string; first_name?: string };
    const recipients: Recipient[] = [];

    if (recipient_type === "admin") {
      // Get admin alert recipients
      const { data: alertRecipients } = await supabase
        .from("internal_alert_recipients")
        .select("email, phone, name")
        .eq("is_active", true);
      
      if (alertRecipients) {
        alertRecipients.forEach((r: any) => {
          recipients.push({ email: r.email, phone: r.phone, first_name: r.name });
        });
      }
    } else if (recipient_id) {
      // Get single recipient profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone, first_name, last_name")
        .eq("id", recipient_id)
        .maybeSingle();

      if (profile) {
        recipients.push({ email: profile.email, phone: profile.phone, first_name: profile.first_name });
      }
    } else if (vars.recipient_email || vars.recipient_phone) {
      // Direct recipient from vars (e.g., newsletter)
      recipients.push({
        email: vars.recipient_email,
        phone: vars.recipient_phone,
        first_name: vars.first_name || "there",
      });
    }

    if (recipients.length === 0) {
      console.log(`No recipients found for ${event_key}`);
      return new Response(JSON.stringify({ skipped: true, reason: "no_recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Load templates
    const templateIds = [eventRow.email_template_id, eventRow.sms_template_id, eventRow.whatsapp_template_id].filter(Boolean);
    let templates: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: tpls } = await supabase
        .from("message_templates")
        .select("*")
        .in("id", templateIds);
      tpls?.forEach((t: any) => { templates[t.id] = t; });
    }

    // 5. Send to each recipient
    const results: any[] = [];

    for (const recipient of recipients) {
      const mergedVars = {
        first_name: recipient.first_name || "there",
        email: recipient.email || "",
        phone: recipient.phone || "",
        platform_url: "https://wishme.today",
        ...vars,
      };

      const recipientResults: any = { recipient: recipient.email || recipient.phone };

      // EMAIL
      if (emailEnabled && recipient.email) {
        const emailTpl = eventRow.email_template_id ? templates[eventRow.email_template_id] : null;
        const subject = replaceVars(emailTpl?.subject || vars.email_subject || `WishMe — ${event_key}`, mergedVars);
        const body = replaceVars(emailTpl?.content || vars.email_body || "", mergedVars);

        if (body) {
          const result = await sendEmail(recipient.email, subject, body);
          recipientResults.email = result;

          await supabase.from("message_logs").insert({
            channel: "email",
            recipient: recipient.email,
            template_id: eventRow.email_template_id,
            template_name: emailTpl?.name || event_key + "_email",
            event_key,
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
            message_id: result.messageId || null,
            metadata: { variables: mergedVars },
          });
        }
      }

      // SMS
      if (smsEnabled && recipient.phone) {
        const smsTpl = eventRow.sms_template_id ? templates[eventRow.sms_template_id] : null;
        const smsBody = replaceVars(smsTpl?.content || vars.sms_body || "", mergedVars);
        const flowId = eventRow.sms_flow_id || undefined;

        if (smsBody || flowId) {
          const result = await sendSMS(recipient.phone, smsBody, flowId);
          recipientResults.sms = result;

          await supabase.from("message_logs").insert({
            channel: "sms",
            recipient: recipient.phone,
            template_id: eventRow.sms_template_id,
            template_name: smsTpl?.name || event_key + "_sms",
            event_key,
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
            metadata: { variables: mergedVars },
          });
        }
      }

      // WHATSAPP
      if (whatsappEnabled && recipient.phone) {
        const waTpl = eventRow.whatsapp_template_id ? templates[eventRow.whatsapp_template_id] : null;
        const waBody = replaceVars(waTpl?.content || vars.whatsapp_body || "", mergedVars);

        if (waBody) {
          const result = await sendWhatsApp(recipient.phone, waBody);
          recipientResults.whatsapp = result;

          await supabase.from("message_logs").insert({
            channel: "whatsapp",
            recipient: recipient.phone,
            template_id: eventRow.whatsapp_template_id,
            template_name: waTpl?.name || event_key + "_whatsapp",
            event_key,
            status: result.success ? "sent" : "failed",
            error_message: result.error || null,
            metadata: { variables: mergedVars },
          });
        }
      }

      results.push(recipientResults);
    }

    console.log(`[send-wishme-notification] ${event_key} completed:`, JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, event_key, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-wishme-notification] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
