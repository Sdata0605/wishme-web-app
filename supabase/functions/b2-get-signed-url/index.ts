import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get fileKey from query parameter or request body
    const url = new URL(req.url);
    let fileKey = url.searchParams.get("fileKey");
    
    if (!fileKey && req.method === "POST") {
      const body = await req.json();
      fileKey = body.fileKey;
    }

    if (!fileKey) {
      throw new Error("fileKey is required");
    }

    console.log("Generating signed URL for:", fileKey);

    // Create AWS S3-compatible client
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    // Construct B2 endpoint URL (handle if endpoint already has protocol)
    const endpoint = B2_ENDPOINT.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;
    const fileUrl = `${endpoint}/${B2_BUCKET_NAME}/${fileKey}`;
    
    // Sign the URL without custom response headers (B2 doesn't fully support them in signed URLs)
    const signedRequest = await aws.sign(fileUrl, {
      method: "GET",
      aws: { 
        signQuery: true,
      }
    });

    const signedUrl = signedRequest.url;
    console.log("Signed URL generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in b2-get-signed-url:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
