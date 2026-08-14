import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Backblaze B2 credentials
const B2_KEY_ID = Deno.env.get("B2_KEY_ID")!;
const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")!;
const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")!;
const B2_ENDPOINT = Deno.env.get("B2_ENDPOINT")!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body with detailed logging
    const rawBody = await req.text();
    console.log("=== Raw Request Body ===");
    console.log(rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let { booking_id, video_url, heygen_video_id } = body;

    // Strip any n8n expression prefix (=) from values
    booking_id = booking_id?.toString().replace(/^=/, '').trim();
    video_url = video_url?.toString().replace(/^=/, '').trim();
    heygen_video_id = heygen_video_id?.toString().replace(/^=/, '').trim();

    console.log("=== Parsed Callback Data ===");
    console.log(JSON.stringify({ booking_id, video_url, heygen_video_id }, null, 2));

    // Validate required fields
    if (!booking_id) {
      console.error("Missing booking_id in request");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required field: booking_id",
          received: body 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!video_url) {
      console.error("Missing video_url in request");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "video_url is required",
          received: body 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching booking: ${booking_id}`);

    // Fetch booking details with user info and celebrity name
    const { data: bookingData, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id, 
        service_type, 
        delivery_type,
        user_id,
        profiles!bookings_user_id_fkey(email, first_name, last_name),
        celebrities(name)
      `)
      .eq("id", booking_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error fetching booking:", fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${fetchError.message}`,
          booking_id 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bookingData) {
      console.error("Booking not found in database:", booking_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Booking not found",
          booking_id 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking found successfully:", booking_id);

    console.log("Downloading video from source URL...");
    
    // Download video from HeyGen URL
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = new Uint8Array(await videoResponse.arrayBuffer());
    console.log("Video downloaded, size:", videoBuffer.byteLength);

    // Determine service type folder
    const serviceTypeFolder = bookingData.service_type === 'wish' ? 'video-wishes' : 
                              bookingData.service_type === 'ugc_video' ? 'ugc-videos' : 
                              bookingData.service_type === 'image_promotion' ? 'image-promotions' :
                              bookingData.delivery_type === 'greeting_card' ? 'greeting-cards' : 'other';

    // Generate unique file key for B2
    const timestamp = Date.now();
    const fileKey = `orders/${serviceTypeFolder}/${booking_id}/video_${timestamp}.mp4`;

    console.log("Uploading to B2:", fileKey);

    // Create AWS S3-compatible client for B2
    const aws = new AwsClient({
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      service: "s3",
      region: "us-east-005",
    });

    // Upload to Backblaze B2
    const endpoint = B2_ENDPOINT.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`;
    const uploadUrl = `${endpoint}/${B2_BUCKET_NAME}/${fileKey}`;
    
    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      body: videoBuffer,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.byteLength.toString(),
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("B2 upload failed:", uploadResponse.status, errorText);
      throw new Error(`B2 upload failed: ${uploadResponse.statusText}`);
    }

    console.log("Video uploaded to B2 successfully:", fileKey);

    // Update booking with B2 file key and status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        video_file_key: fileKey,
        video_status: 'ready',
        video_url: video_url, // Keep original URL for reference
        heygen_video_id: heygen_video_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    console.log("Booking updated successfully with B2 file key:", booking_id);

    // Send email notification (non-blocking)
    const userEmail = bookingData.profiles?.email || "sdata0605@gmail.com";
    const celebrityName = bookingData.celebrities?.name || "Celebrity";
    const serviceName = bookingData.service_type === 'wish' ? 'Video Wish' : 
                        bookingData.service_type === 'ugc_video' ? 'UGC Video' : 
                        bookingData.delivery_type === 'greeting_card' ? 'Greeting Card' : 'Order';
    
    const previewUrl = `https://eqikeuqwbphwongtfzhe.supabase.co/bookings/${booking_id}`;

    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await supabase.functions.invoke("send-order-notification", {
            body: {
              to: userEmail,
              subject: `Your ${serviceName} from ${celebrityName} is Ready! 🎉`,
              bookingId: booking_id,
              celebrityName: celebrityName,
              videoPreviewUrl: previewUrl,
              serviceName: serviceName,
            },
          });
          console.log("Email notification sent to:", userEmail);
        } catch (emailError) {
          console.error("Failed to send email (non-blocking):", emailError);
        }
      })()
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Video uploaded to B2 and booking updated successfully",
        booking: updatedBooking,
        file_key: fileKey
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unexpected error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
