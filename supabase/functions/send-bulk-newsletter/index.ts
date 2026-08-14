import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  subject: string;
  content: string;
  filter?: 'all' | 'active';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify user is admin
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: claims, error: claimsError } = await userSupabase.auth.getUser();
    if (claimsError || !claims.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userRoles } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.user.id)
      .eq('role', 'admin')
      .single();

    if (!userRoles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, content, filter = 'active' }: BulkEmailRequest = await req.json();

    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: 'Subject and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch newsletter subscribers
    let query = adminSupabase
      .from('newsletter_subscriptions')
      .select('email');
    
    if (filter === 'active') {
      query = query.eq('status', 'active');
    }

    const { data: subscribers, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch subscribers: ${fetchError.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscribers found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emails = subscribers.map(s => s.email);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send emails in batches of 50
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const sendPromises = batch.map(async (email) => {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Wish Me <noreply@wishme.today>',
              to: [email],
              subject: subject,
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #0f0d1a; color: #f1f0f3;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #F97316, #EC4899, #8B5CF6); padding: 3px; border-radius: 16px 16px 0 0;">
                      <div style="background-color: #1a1625; padding: 28px; border-radius: 14px 14px 0 0; text-align: center;">
                        <img src="https://wishmefinal.lovable.app/wish-me-logo.png" alt="Wish Me" style="height: 40px;" />
                      </div>
                    </div>
                    <div style="background-color: #1a1625; padding: 32px; border: 1px solid #2a2540; border-top: none;">
                      <div style="color: #f1f0f3; font-size: 15px; line-height: 1.7;">${content}</div>
                    </div>
                    <div style="background-color: #1a1625; padding: 24px 32px; border: 1px solid #2a2540; border-top: none; border-radius: 0 0 16px 16px; text-align: center;">
                      <p style="color: #6b6580; font-size: 12px; margin: 0;">You subscribed to Wish Me updates · <a href="https://wishme.today" style="color: #8B5CF6; text-decoration: none;">wishme.today</a></p>
                      <p style="color: #4a4460; font-size: 11px; margin: 8px 0 0;">© ${new Date().getFullYear()} Wish Me</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          if (response.ok) {
            successCount++;
            // Log successful send
            await adminSupabase.from('message_logs').insert({
              channel: 'email',
              recipient: email,
              template_name: 'Bulk Newsletter',
              event_key: 'BULK_NEWSLETTER',
              status: 'sent',
            });
          } else {
            failCount++;
            const errorText = await response.text();
            errors.push(`${email}: ${errorText}`);
            await adminSupabase.from('message_logs').insert({
              channel: 'email',
              recipient: email,
              template_name: 'Bulk Newsletter',
              event_key: 'BULK_NEWSLETTER',
              status: 'failed',
              error_message: errorText,
            });
          }
        } catch (err: any) {
          failCount++;
          errors.push(`${email}: ${err.message}`);
        }
      });

      await Promise.all(sendPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Bulk email completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: `Bulk email completed`,
        total: emails.length,
        sent: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Bulk email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send bulk emails' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
