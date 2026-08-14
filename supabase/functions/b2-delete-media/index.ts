import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    
    console.log("Verifying user authentication...");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error("Auth error:", authError.message);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error("No user found for token");
      throw new Error("User not found - please log in again");
    }

    console.log("User authenticated:", user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError.message);
      throw new Error("Failed to verify user profile");
    }

    if (!profile || profile.role !== "admin") {
      console.error("User is not an admin:", user.id);
      throw new Error("Only admins can delete media");
    }
    
    console.log("Admin access verified");

    const { mediaId } = await req.json();

    if (!mediaId) {
      throw new Error("mediaId is required");
    }

    // Get media record
    const { data: media, error: fetchError } = await supabase
      .from("media_library")
      .select("file_key, thumbnail_key")
      .eq("id", mediaId)
      .single();

    if (fetchError || !media) {
      throw new Error("Media not found");
    }

    console.log("Deleting media:", mediaId, "File key:", media.file_key);

    // Create AWS S3-compatible client
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    // Construct B2 endpoint URL (handle if endpoint already has protocol)
    const endpoint = B2_ENDPOINT.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;
    const deleteUrl = `${endpoint}/${B2_BUCKET_NAME}/${media.file_key}`;
    
    const deleteResponse = await aws.fetch(deleteUrl, {
      method: "DELETE",
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text();
      console.error("B2 delete failed:", deleteResponse.status, errorText);
      throw new Error(`B2 delete failed: ${deleteResponse.statusText}`);
    }
    
    console.log("File deleted from B2");

    // Delete thumbnail if exists
    if (media.thumbnail_key) {
      const deleteThumbnailUrl = `${endpoint}/${B2_BUCKET_NAME}/${media.thumbnail_key}`;
      await aws.fetch(deleteThumbnailUrl, {
        method: "DELETE",
      });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("media_library")
      .delete()
      .eq("id", mediaId);

    if (deleteError) {
      throw new Error(`Failed to delete from database: ${deleteError.message}`);
    }

    console.log("Media deleted successfully");

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in b2-delete-media:", error);
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
