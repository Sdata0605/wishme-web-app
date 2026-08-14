import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Check if user is admin and get profile ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can upload media");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || null;
    const category = formData.get("category") as string || null;
    const isFeatured = formData.get("isFeatured") === "true";

    if (!file) {
      throw new Error("No file provided");
    }

    console.log("Uploading file to Backblaze B2:", file.name, "Size:", file.size, "Category:", category);

    // Get B2 credentials from secrets
    const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
    const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
    const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
    const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;

    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
      throw new Error("B2 credentials not configured");
    }

    console.log("B2 Configuration - Bucket:", B2_BUCKET_NAME, "Endpoint:", B2_ENDPOINT);

    // Initialize AWS S3-compatible client for B2
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `${category}/${timestamp}-${sanitizedFilename}`;

    console.log("Generated file key:", fileKey);

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to B2 using S3-compatible API
    const uploadUrl = `https://${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileKey}`;
    console.log("Uploading to B2 URL:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("B2 upload failed:", uploadResponse.status, errorText);
      throw new Error(`B2 upload failed: ${uploadResponse.status} ${errorText}`);
    }

    console.log("File uploaded successfully to B2:", fileKey);

    // Determine file type
    const fileType = file.type.startsWith("video/") ? "video" : "audio";

    // Save metadata to database with B2 file key (NOT full URL)
    const { data: mediaRecord, error: dbError } = await supabase
      .from("media_library")
      .insert({
        title,
        description,
        file_key: fileKey, // Store B2 path: "banner/123-video.mp4"
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        category,
        is_featured: isFeatured,
        created_by: profile.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save metadata: ${dbError.message}`);
    }

    console.log("Media record created in database:", mediaRecord.id, "File key:", fileKey);

    return new Response(
      JSON.stringify({
        success: true,
        data: mediaRecord,
        message: "Video uploaded successfully to Backblaze B2",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in b2-upload-media:", error);
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
