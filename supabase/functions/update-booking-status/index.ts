import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT using getClaims (doesn't require active session)
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log("Verifying user authentication via getClaims...");
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);

    if (authError || !claimsData?.claims?.sub) {
      console.error("Auth error:", authError?.message || "No claims found");
      return new Response(
        JSON.stringify({ success: false, error: `Authentication failed: ${authError?.message || "Invalid token"}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("User authenticated:", userId);

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' });

    if (roleError) {
      console.error("Role check error:", roleError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify admin status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.error("User is not an admin:", userId);
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can update bookings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Admin access verified");

    const { bookingId, status, deliveryDate, adminNotes, scriptContent, generateScript } = await req.json();

    // Validate input
    if (!bookingId || !status) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: bookingId and status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled", "video_sent", "failed"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid status value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing booking to validate
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error("Booking fetch error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse message if it's JSON and extract content for validation
    let hasValidContent = false;
    let contentSource = '';
    
    try {
      if (existingBooking.message) {
        const parsedMessage = JSON.parse(existingBooking.message);
        
        console.log("Parsed message structure:", JSON.stringify({
          requestDetails: parsedMessage?.requestDetails,
          scriptBuilder: parsedMessage?.scriptBuilder,
          creativeGuidelines: parsedMessage?.creativeGuidelines
        }, null, 2));
        
        // Check ALL possible content sources in JSON
        const requestMessage = parsedMessage?.requestDetails?.message?.trim() || '';
        const talkingPoints = parsedMessage?.scriptBuilder?.talkingPoints?.trim() || '';
        const exactScript = parsedMessage?.scriptBuilder?.exactScript?.trim() || '';
        const generatedScript = parsedMessage?.scriptBuilder?.generatedScript?.trim() || '';
        const otherInfo = parsedMessage?.creativeGuidelines?.otherInfo?.trim() || '';
        const recipientName = parsedMessage?.requestDetails?.recipientName?.trim() || '';
        const goal = parsedMessage?.creativeGuidelines?.goal?.trim() || '';
        
        console.log("Content lengths:", {
          requestMessage: requestMessage.length,
          talkingPoints: talkingPoints.length,
          exactScript: exactScript.length,
          generatedScript: generatedScript.length,
          otherInfo: otherInfo.length,
          recipientName: recipientName.length,
          goal: goal.length
        });
        
        // Accept if ANY content source has valid data (lowered to 5 chars for more flexibility)
        if (talkingPoints.length >= 5) {
          hasValidContent = true;
          contentSource = 'scriptBuilder.talkingPoints';
        } else if (exactScript.length >= 5) {
          hasValidContent = true;
          contentSource = 'scriptBuilder.exactScript';
        } else if (generatedScript.length >= 5) {
          hasValidContent = true;
          contentSource = 'scriptBuilder.generatedScript';
        } else if (requestMessage.length >= 5) {
          hasValidContent = true;
          contentSource = 'requestDetails.message';
        } else if (otherInfo.length >= 5) {
          hasValidContent = true;
          contentSource = 'creativeGuidelines.otherInfo';
        } else if (goal.length >= 5) {
          hasValidContent = true;
          contentSource = 'creativeGuidelines.goal';
        } else if (recipientName.length >= 2) {
          // At minimum, if we have a recipient name, we can generate a script
          hasValidContent = true;
          contentSource = 'requestDetails.recipientName';
        }
        
        console.log("Content validation - Source:", contentSource, "Valid:", hasValidContent);
      }
    } catch (e) {
      // Not JSON, validate raw message
      console.log("Message is not JSON, checking raw content");
      const rawMessage = existingBooking.message?.trim() || '';
      if (rawMessage.length >= 5) {
        hasValidContent = true;
        contentSource = 'raw message';
        console.log("Content validation - Using raw message, length:", rawMessage.length);
      }
    }
    
    // Also check if script is already saved in booking
    if (!hasValidContent && existingBooking.script_content && existingBooking.script_content.trim().length >= 5) {
      hasValidContent = true;
      contentSource = 'existing script_content';
      console.log("Content validation - Using existing script_content");
    }
    
    // Also check if script is provided directly in this request
    if (!hasValidContent && scriptContent && scriptContent.trim().length >= 5) {
      hasValidContent = true;
      contentSource = 'admin-provided script';
      console.log("Content validation - Using admin-provided script");
    }
    
    // Allow AI script generation if no content
    if (!hasValidContent && generateScript) {
      hasValidContent = true;
      contentSource = 'will-generate-with-ai';
      console.log("Content validation - Will generate with AI");
    }
    
    // Validate that booking has some content
    if (!hasValidContent) {
      console.error("No valid content found in booking");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Booking must include message or script content (minimum 5 characters), or enable AI script generation" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Content validation passed, source:", contentSource);

    // Require delivery date for confirmed status
    if (status === "confirmed" && !deliveryDate && !existingBooking.delivery_date) {
      return new Response(
        JSON.stringify({ success: false, error: "Delivery date is required for confirmed bookings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (deliveryDate) {
      const deliveryDateTime = new Date(deliveryDate);
      const now = new Date();
      
      if (deliveryDateTime < now) {
        return new Response(
          JSON.stringify({ success: false, error: "Delivery date cannot be in the past" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Security check: Prevent status changes to already completed bookings
    if (existingBooking.status === "completed" && status !== "completed") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Cannot modify completed bookings" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      admin_notes: adminNotes || existingBooking.admin_notes,
      updated_at: new Date().toISOString(),
    };

    if (deliveryDate) {
      updateData.delivery_date = deliveryDate;
    }

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    // Save script content if provided
    if (scriptContent) {
      updateData.script_content = scriptContent;
    }

    // Auto-generate verification code if missing for terminal video states
    if (['completed', 'video_sent'].includes(status) && !existingBooking.recipient_verification_code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      updateData.recipient_verification_code = code;
      console.log('Auto-generated verification code during status update:', code);
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select(`
        *,
        celebrities:celebrity_id(id, name, category, heygen_avatar_id, heygen_voice_id),
        users:user_id(id, first_name, last_name, email, phone)
      `)
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update booking: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Booking updated successfully:", bookingId);

    // Trigger generation if booking is being confirmed
    if (status === "confirmed" && existingBooking.status !== "confirmed") {
      const serviceType = existingBooking.service_type;
      
      // Parse delivery type from booking message
      let deliveryType = '';
      let concept = '';
      let brandingDetails = '';
      try {
        const parsed = JSON.parse(existingBooking.message || '{}');
        deliveryType = parsed.deliveryType || '';
        concept = parsed.requestDetails?.message || parsed.scriptBuilder?.talkingPoints || '';
        brandingDetails = parsed.creativeGuidelines?.otherInfo || parsed.scriptBuilder?.requiredLines || '';
      } catch { 
        concept = existingBooking.message || '';
      }

      const shouldGenerateImage = serviceType === 'image_promotion' || deliveryType === 'card' || deliveryType === 'both';
      const shouldGenerateVideo = (serviceType !== 'image_promotion' && deliveryType !== 'card') || deliveryType === 'both';
      
      console.log(`Booking confirmed - service_type: ${serviceType}, deliveryType: ${deliveryType}, image: ${shouldGenerateImage}, video: ${shouldGenerateVideo}`);
      
      try {
        // ── IMAGE GENERATION (inline via AI gateway) ──
        if (shouldGenerateImage) {
          console.log("Triggering inline image promotion generation...");
          const LOVABLE_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
          
          if (!LOVABLE_API_KEY) {
            console.error("LOVABLE_API_KEY not configured, cannot generate image");
            await supabase.from("bookings").update({
              admin_notes: (updateData.admin_notes || '') + `\n[Image Error] LOVABLE_API_KEY not configured`,
              generation_status: shouldGenerateVideo ? undefined : 'failed',
              generation_error: 'LOVABLE_API_KEY not configured'
            }).eq("id", bookingId);
          } else {
            const celebrity = updatedBooking.celebrities;
            const celebrityName = celebrity?.name || 'Celebrity';
            const celebrityCategory = celebrity?.category || 'Entertainment';
            
            const imagePrompt = `Create a professional promotional image for ${celebrityName} (${celebrityCategory}). ${concept ? `Concept: ${concept}.` : ''} ${brandingDetails ? `Branding: ${brandingDetails}.` : ''} Make it vibrant, eye-catching, and suitable for social media marketing. Include the celebrity name "${celebrityName}" as text in the image.`;
            
            console.log("Image prompt:", imagePrompt);
            
            try {
              const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image",
                  messages: [{ role: "user", content: imagePrompt }],
                  modalities: ["image", "text"]
                }),
              });

              if (!aiResponse.ok) {
                const errText = await aiResponse.text();
                throw new Error(`AI gateway error ${aiResponse.status}: ${errText}`);
              }

              const aiData = await aiResponse.json();
              const base64Image = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              
              if (!base64Image) {
                throw new Error("No image returned from AI gateway");
              }

              // Upload to Supabase storage
              const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
              const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const fileName = `promotions/${bookingId}_${Date.now()}.png`;
              
              const { error: uploadError } = await supabase.storage
                .from('greeting-card-uploads')
                .upload(fileName, imageBytes, { contentType: 'image/png', upsert: true });

              if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message}`);
              }

              const { data: urlData } = supabase.storage.from('greeting-card-uploads').getPublicUrl(fileName);
              const publicUrl = urlData?.publicUrl;

              console.log("Image generated and uploaded:", publicUrl);
              await supabase.from("bookings").update({
                admin_notes: (updateData.admin_notes || '') + `\n[Image] Generation completed at ${new Date().toISOString()}`,
                generation_status: shouldGenerateVideo ? undefined : 'completed',
                card_url: publicUrl || null
              }).eq("id", bookingId);
            } catch (imgErr: any) {
              console.error("Inline image generation error:", imgErr.message);
              await supabase.from("bookings").update({
                admin_notes: (updateData.admin_notes || '') + `\n[Image Error] ${imgErr.message}`,
                generation_status: shouldGenerateVideo ? undefined : 'failed',
                generation_error: imgErr.message
              }).eq("id", bookingId);
            }
          }
        }

        // ── VIDEO GENERATION ──
        if (shouldGenerateVideo) {
          const celebrity = updatedBooking.celebrities;
          if (!celebrity?.heygen_avatar_id || !celebrity?.heygen_voice_id) {
            console.warn("Celebrity missing HeyGen configuration:", celebrity);
            await supabase.from("bookings").update({
              admin_notes: (updateData.admin_notes || '') + `\n[Warning] Celebrity missing HeyGen Avatar/Voice ID - video generation skipped`,
              generation_status: 'failed',
              generation_error: 'Celebrity missing HeyGen Avatar ID or Voice ID'
            }).eq("id", bookingId);
          } else {
            const videoResponse = await supabase.functions.invoke('process-video-order', {
              body: {
                bookingId,
                scriptContent: scriptContent || null,
                generateScript: generateScript || false
              }
            });

            if (videoResponse.error) {
              console.error("Video generation trigger error:", videoResponse.error);
              await supabase.from("bookings").update({
                admin_notes: (updateData.admin_notes || '') + `\n[Video Error] ${videoResponse.error.message || 'Failed to start video generation'}`,
                generation_status: 'failed',
                generation_error: videoResponse.error.message || 'Failed to start video generation'
              }).eq("id", bookingId);
            } else {
              console.log("Video generation started successfully:", videoResponse.data);
              await supabase.from("bookings").update({
                admin_notes: (updateData.admin_notes || '') + `\n[Video] Generation started at ${new Date().toISOString()}`
              }).eq("id", bookingId);
            }
          }
        }
      } catch (genError: any) {
        console.error("Generation error (non-blocking):", genError.message);
        await supabase.from("bookings").update({
          admin_notes: (updateData.admin_notes || '') + `\n[Error] ${genError.message}`,
          generation_status: 'failed',
          generation_error: genError.message
        }).eq("id", bookingId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: updatedBooking,
        message: "Booking updated successfully" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error("Error in update-booking-status:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
