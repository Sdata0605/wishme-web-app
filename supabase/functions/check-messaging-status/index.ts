import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusCheckRequest {
  service: 'resend' | 'whatsapp' | 'both';
}

interface StatusResult {
  resend?: {
    connected: boolean;
    message: string;
    details?: any;
  };
  whatsapp?: {
    connected: boolean;
    message: string;
    details?: any;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: StatusCheckRequest = await req.json();
    const { service = 'both' } = body;
    
    const result: StatusResult = {};

    // Check Resend API
    if (service === 'resend' || service === 'both') {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendApiKey) {
        result.resend = {
          connected: false,
          message: "RESEND_API_KEY not configured",
        };
      } else {
        try {
          const response = await fetch("https://api.resend.com/domains", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            result.resend = {
              connected: true,
              message: `Connected successfully. ${data.data?.length || 0} domain(s) configured.`,
              details: {
                domains: data.data?.map((d: any) => ({
                  name: d.name,
                  status: d.status,
                })) || [],
              },
            };
          } else {
            const error = await response.text();
            result.resend = {
              connected: false,
              message: `API error: ${response.status} - ${error}`,
            };
          }
        } catch (e: any) {
          result.resend = {
            connected: false,
            message: `Connection failed: ${e.message}`,
          };
        }
      }
    }

    // Check WhatsApp (Meta) API
    if (service === 'whatsapp' || service === 'both') {
      const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      
      if (!whatsappToken || !phoneNumberId) {
        result.whatsapp = {
          connected: false,
          message: !whatsappToken 
            ? "WHATSAPP_ACCESS_TOKEN not configured" 
            : "WHATSAPP_PHONE_NUMBER_ID not configured",
        };
      } else {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${whatsappToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            result.whatsapp = {
              connected: true,
              message: `Connected to: ${data.verified_name || data.display_phone_number || phoneNumberId}`,
              details: {
                phone_number: data.display_phone_number,
                verified_name: data.verified_name,
                quality_rating: data.quality_rating,
              },
            };
          } else {
            const error = await response.text();
            result.whatsapp = {
              connected: false,
              message: `API error: ${response.status} - ${error}`,
            };
          }
        } catch (e: any) {
          result.whatsapp = {
            connected: false,
            message: `Connection failed: ${e.message}`,
          };
        }
      }
    }

    console.log("Messaging status check result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error checking messaging status:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
