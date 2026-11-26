import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 5000;

const json = (payload: unknown, status: number) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

/** Sends the reply to the ticket's email through Resend. Never throws. */
async function sendReplyEmail(args: {
  to: string;
  subject: string;
  reply: string;
  originalMessage: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const quoted = args.originalMessage
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  const text = [
    args.reply,
    "",
    "--",
    "You wrote to Wish Me support: ",
    "",
    quoted,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wish Me Support <noreply@wishme.today>",
        reply_to: "support@wishme.today",
        to: [args.to],
        subject: `Re: ${args.subject}`,
        text,
      }),
    });

    if (response.ok) {
      return { sent: true, error: null };
    }

    const errorBody = await response.text();
    return {
      sent: false,
      error: `Resend ${response.status}: ${errorBody.slice(0, 500)}`,
    };
  } catch (err: any) {
    return { sent: false, error: `Resend request failed: ${err?.message ?? String(err)}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    // Validate input
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const ticketId = typeof payload?.ticket_id === "string" ? payload.ticket_id.trim() : "";
    if (!UUID_RE.test(ticketId)) {
      return json({ ok: false, error: "ticket_id must be a uuid" }, 400);
    }

    const replyBody = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (replyBody.length < 1 || replyBody.length > MAX_BODY) {
      return json({ ok: false, error: `body must be 1..${MAX_BODY} characters` }, 400);
    }

    // Load the ticket with the caller's own client. RLS only returns it
    // for admins (or the ticket owner), so an empty result means the caller
    // is not an admin. The explicit admin check below closes the owner case.
    const { data: ticket, error: ticketError } = await userClient
      .from("support_tickets")
      .select("id, email, subject, message")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error("Ticket lookup failed:", ticketError.message);
      return json({ ok: false, error: "Failed to load ticket" }, 500);
    }

    const { data: isAdmin } = await userClient.rpc("is_admin_by_auth_uid");

    if (!ticket || isAdmin !== true) {
      return json({ ok: false, error: "Admin access required" }, 403);
    }

    // Writes use the service role (replies have no client INSERT policy)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: reply, error: insertError } = await adminClient
      .from("support_ticket_replies")
      .insert({
        ticket_id: ticket.id,
        admin_id: callerId,
        body: replyBody,
      })
      .select("id, body, created_at")
      .single();

    if (insertError || !reply) {
      console.error("Reply insert failed:", insertError?.message);
      return json({ ok: false, error: "Failed to save reply" }, 500);
    }

    const email = await sendReplyEmail({
      to: ticket.email,
      subject: ticket.subject,
      reply: replyBody,
      originalMessage: ticket.message,
    });

    const { error: replyUpdateError } = await adminClient
      .from("support_ticket_replies")
      .update({ email_sent: email.sent, email_error: email.error })
      .eq("id", reply.id);
    if (replyUpdateError) {
      console.error("Reply update failed:", replyUpdateError.message);
    }

    // Only a reply that actually reached the user moves the ticket to "replied". A failed email leaves it as it was.
    const now = new Date().toISOString();
    if (email.sent) {
      const { error: ticketUpdateError } = await adminClient
        .from("support_tickets")
        .update({ status: "replied", last_replied_at: now, updated_at: now })
        .eq("id", ticket.id);
      if (ticketUpdateError) {
        console.error("Ticket update failed:", ticketUpdateError.message);
      }
    }

    return json(
      {
        ok: true,
        emailSent: email.sent,
        ...(email.sent ? {} : { emailError: email.error }),
        reply: {
          id: reply.id,
          body: reply.body,
          created_at: reply.created_at,
        },
      },
      200,
    );
  } catch (error: any) {
    console.error("support-ticket-reply error:", error);
    return json({ ok: false, error: error?.message ?? "Internal error" }, 500);
  }
});
