import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  channel: 'email' | 'whatsapp' | 'both';
  recipient_email?: string;
  recipient_phone?: string;
  template_id?: string;
  event_key?: string;
  variables: Record<string, string>;
  subject_override?: string;
  user_id?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  content: string;
  variables: string[];
}

interface MessagingSetting {
  setting_key: string;
  setting_value: string;
}

// Replace variables in template content
function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value || '');
  }
  return result;
}

// Format phone number to E.164
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendMessageRequest = await req.json();
    const { channel, recipient_email, recipient_phone, template_id, event_key, variables, subject_override, user_id } = body;

    console.log("Send unified message request:", { channel, template_id, event_key });

    // Get messaging settings
    const { data: settings, error: settingsError } = await supabase
      .from('messaging_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      throw new Error(`Failed to fetch messaging settings: ${settingsError.message}`);
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: MessagingSetting) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    // Get template
    let template: MessageTemplate | null = null;
    if (template_id) {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();
      
      if (error) throw new Error(`Template not found: ${error.message}`);
      template = data;
    } else if (event_key) {
      // Get template from event
      const { data: eventData, error: eventError } = await supabase
        .from('message_events')
        .select('email_template_id, whatsapp_template_id')
        .eq('event_key', event_key)
        .eq('is_enabled', true)
        .single();

      if (eventError) {
        console.log(`Event not found or disabled: ${event_key}`);
        return new Response(JSON.stringify({ success: false, message: 'Event not found or disabled' }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const templateIdToUse = channel === 'whatsapp' ? eventData.whatsapp_template_id : eventData.email_template_id;
      
      if (templateIdToUse) {
        const { data, error } = await supabase
          .from('message_templates')
          .select('*')
          .eq('id', templateIdToUse)
          .eq('is_active', true)
          .single();
        
        if (!error) template = data;
      }
    }

    if (!template) {
      throw new Error('No valid template found');
    }

    const results = {
      email: { sent: false, error: null as string | null, messageId: null as string | null },
      whatsapp: { sent: false, error: null as string | null, messageId: null as string | null },
    };

    // Send email if requested
    if ((channel === 'email' || channel === 'both') && recipient_email) {
      try {
        const resendApiKey = settingsMap['resend_api_key'] || Deno.env.get("RESEND_API_KEY");
        
        if (!resendApiKey) {
          throw new Error('Resend API key not configured');
        }

        const resend = new Resend(resendApiKey);
        // Use onboarding@resend.dev as fallback (works without domain verification)
        const fromAddress = settingsMap['email_from_address'] || 'onboarding@resend.dev';
        const fromName = settingsMap['email_from_name'] || 'Wish Me';
        console.log('Sending email message');
        const emailContent = replaceVariables(template.content, variables);
        const emailSubject = subject_override || replaceVariables(template.subject || '', variables);

        const emailResponse = await resend.emails.send({
          from: `${fromName} <${fromAddress}>`,
          to: [recipient_email],
          subject: emailSubject,
          html: emailContent,
        });

        results.email.sent = true;
        results.email.messageId = emailResponse.data?.id || null;
        console.log("Email sent successfully:", emailResponse);

        // Log the message
        await supabase.from('message_logs').insert({
          channel: 'email',
          recipient: recipient_email,
          template_id: template.id,
          template_name: template.name,
          event_key: event_key || null,
          status: 'sent',
          message_id: emailResponse.data?.id,
          metadata: { variables, subject: emailSubject },
          user_id: user_id || null,
        });

      } catch (emailError: any) {
        console.error("Email send error:", emailError);
        results.email.error = emailError.message;

        // Log the failure
        await supabase.from('message_logs').insert({
          channel: 'email',
          recipient: recipient_email,
          template_id: template.id,
          template_name: template.name,
          event_key: event_key || null,
          status: 'failed',
          error_message: emailError.message,
          metadata: { variables },
          user_id: user_id || null,
        });
      }
    }

    // Send WhatsApp if requested
    if ((channel === 'whatsapp' || channel === 'both') && recipient_phone) {
      try {
        const whatsappToken = settingsMap['whatsapp_access_token'] || Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const phoneNumberId = settingsMap['whatsapp_phone_number_id'] || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

        if (!whatsappToken || !phoneNumberId) {
          throw new Error('WhatsApp API not configured');
        }

        const formattedPhone = formatPhoneNumber(recipient_phone);
        const whatsappContent = replaceVariables(template.content, variables);

        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'text',
              text: { body: whatsappContent },
            }),
          }
        );

        const whatsappData = await whatsappResponse.json();

        if (!whatsappResponse.ok) {
          throw new Error(whatsappData.error?.message || 'WhatsApp send failed');
        }

        results.whatsapp.sent = true;
        results.whatsapp.messageId = whatsappData.messages?.[0]?.id || null;
        console.log("WhatsApp sent successfully:", whatsappData);

        // Log the message
        await supabase.from('message_logs').insert({
          channel: 'whatsapp',
          recipient: formattedPhone,
          template_id: template.id,
          template_name: template.name,
          event_key: event_key || null,
          status: 'sent',
          message_id: whatsappData.messages?.[0]?.id,
          metadata: { variables },
          user_id: user_id || null,
        });

      } catch (whatsappError: any) {
        console.error("WhatsApp send error:", whatsappError);
        results.whatsapp.error = whatsappError.message;

        // Log the failure
        await supabase.from('message_logs').insert({
          channel: 'whatsapp',
          recipient: recipient_phone,
          template_id: template.id,
          template_name: template.name,
          event_key: event_key || null,
          status: 'failed',
          error_message: whatsappError.message,
          metadata: { variables },
          user_id: user_id || null,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-unified-message:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
