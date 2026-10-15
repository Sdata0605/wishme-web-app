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
 * Admin uploads the finished video for a Wish a Friend order (video wish or UGC video).
 * Verifies the caller is an admin, stores the file in Backblaze B2 and marks the order
 * completed so it shows up with the video in the buyer's My Orders.
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);
    if (profile?.role !== "admin" && !roleRow) {
      throw new Error("Only admins can upload videos");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("order_id") as string;
    const adminNotes = (formData.get("admin_notes") as string) || null;
    if (!file || !orderId) throw new Error("Missing file or order_id");

    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mov|mkv|webm|avi)$/i)) {
      throw new Error("Invalid file type. Allowed: MP4, MOV, MKV, WebM, AVI");
    }

    const { data: order, error: orderError } = await supabase
      .from("wish_friend_orders")
      .select("id, status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("Order not found");
    if (order.status === "rejected") throw new Error("This order was rejected");

    const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
    const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
    const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
    const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;
    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
      throw new Error("B2 credentials not configured");
    }

    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const fileKey = `wish-friend/${orderId}/${Date.now()}.${extension}`;

    const uploadResponse = await aws.fetch(`https://${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileKey}`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "video/mp4" },
      body: await file.arrayBuffer(),
    });
    if (!uploadResponse.ok) {
      console.error("B2 upload failed:", uploadResponse.status, await uploadResponse.text());
      throw new Error(`B2 upload failed: ${uploadResponse.status}`);
    }

    const publicVideoUrl = `https://f005.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileKey}`;

    const { error: updateError } = await supabase
      .from("wish_friend_orders")
      .update({
        status: "completed",
        video_url: publicVideoUrl,
        video_file_key: fileKey,
        completed_at: new Date().toISOString(),
        ...(adminNotes ? { admin_notes: adminNotes } : {}),
      })
      .eq("id", orderId);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, video_url: publicVideoUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in upload-wish-friend-video:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
