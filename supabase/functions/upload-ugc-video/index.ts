import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Upload local video file for UGC Ad
 * 
 * Admin uploads a video file directly (MP4, MOV, MKV etc.)
 * This function:
 * 1. Verifies admin authentication
 * 2. Uploads video to Backblaze B2
 * 3. Updates UGC ad record with video URL
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can upload UGC videos");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const ugcAdId = formData.get("ugc_ad_id") as string;

    if (!file || !ugcAdId) {
      throw new Error("Missing file or ugc_ad_id");
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/avi"];
    if (!allowedTypes.some(type => file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|mkv|webm|avi)$/i))) {
      throw new Error("Invalid file type. Allowed: MP4, MOV, MKV, WebM, AVI");
    }

    console.log("=== UPLOADING LOCAL UGC VIDEO ===");
    console.log("UGC Ad ID:", ugcAdId);
    console.log("File:", file.name, "Size:", file.size, "Type:", file.type);

    // Verify UGC ad exists
    const { data: ugcAd, error: ugcError } = await supabase
      .from("ugc_ads")
      .select("*")
      .eq("id", ugcAdId)
      .single();

    if (ugcError || !ugcAd) {
      throw new Error("UGC Ad not found");
    }

    // Update status to processing
    await supabase
      .from("ugc_ads")
      .update({ status: "processing" })
      .eq("id", ugcAdId);

    // Get B2 credentials
    const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
    const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
    const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
    const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;

    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
      throw new Error("B2 credentials not configured");
    }

    // Initialize AWS S3-compatible client for B2
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    // Generate unique file key
    const timestamp = Date.now();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const fileKey = `ugc-ads/${ugcAdId}/${timestamp}.${extension}`;

    console.log("Generated file key:", fileKey);

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to B2
    const uploadUrl = `https://${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileKey}`;
    console.log("Uploading to B2 URL:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "video/mp4",
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("B2 upload failed:", uploadResponse.status, errorText);
      throw new Error(`B2 upload failed: ${uploadResponse.status}`);
    }

    console.log("File uploaded successfully to B2");

    // Construct public URL
    const publicVideoUrl = `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileKey}`;

    // Update UGC ad with video URL and completed status
    const { error: updateError } = await supabase
      .from("ugc_ads")
      .update({
        status: "completed",
        video_url: publicVideoUrl,
        video_file_key: fileKey,
        completed_at: new Date().toISOString(),
      })
      .eq("id", ugcAdId);

    if (updateError) {
      console.error("Error updating UGC ad:", updateError);
      throw updateError;
    }

    console.log("=== UGC VIDEO UPLOAD COMPLETE ===");
    console.log("Video URL:", publicVideoUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video uploaded and delivered successfully",
        video_url: publicVideoUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in upload-ugc-video:", error);
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
