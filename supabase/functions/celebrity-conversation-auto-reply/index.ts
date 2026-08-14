import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    if (!lovableApiKey) {
      throw new Error("Missing LOVABLE_API_KEY for AI Gateway");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const conversationId = body.conversationId as string | undefined;
    const messageId = body.messageId as string | undefined;
    const celebrityId = body.celebrityId as string | undefined;
    const messageText = (body.messageText || body.userMessage) as string | undefined;

    if (!conversationId || !messageText) {
      throw new Error("conversationId and messageText are required");
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        id,
        celebrity_id,
        unread_count_user,
        celebrity:celebrities!conversations_celebrity_id_fkey (
          id,
          name,
          bio,
          category,
          profile_id
        )
      `)
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation?.celebrity) {
      throw new Error("Conversation or celebrity not found");
    }

    const resolvedCelebrityId = celebrityId || conversation.celebrity_id;

    const { data: settings } = await supabase
      .from("celebrity_settings")
      .select("ai_auto_reply_enabled, auto_reply_enabled")
      .eq("celebrity_id", resolvedCelebrityId)
      .maybeSingle();

    const autoReplyEnabled = settings?.ai_auto_reply_enabled === true || settings?.auto_reply_enabled === true;
    if (!autoReplyEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "ai_auto_reply_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!conversation.celebrity.profile_id) {
      throw new Error("Celebrity profile is not linked");
    }

    const { data: celebrityProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", conversation.celebrity.profile_id)
      .maybeSingle();

    if (!celebrityProfile?.id) {
      throw new Error("Celebrity profile not found");
    }

    let originalMessageCreatedAt: string | null = null;
    if (messageId) {
      const { data: sourceMessage } = await supabase
        .from("messages")
        .select("created_at, sender_type, is_ai_generated")
        .eq("id", messageId)
        .maybeSingle();

      if (sourceMessage?.sender_type !== "user" || sourceMessage?.is_ai_generated) {
        return new Response(JSON.stringify({ skipped: true, reason: "invalid_source_message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      originalMessageCreatedAt = sourceMessage?.created_at ?? null;
    }

    const duplicateCheckStart = originalMessageCreatedAt ?? new Date(Date.now() - 15000).toISOString();
    const { data: existingReply } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("is_ai_generated", true)
      .gte("created_at", duplicateCheckStart)
      .limit(1);

    if (existingReply && existingReply.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "duplicate_reply_prevented" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("sender_type, message_text")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (historyError) {
      throw historyError;
    }

    const historyText = (history || [])
      .reverse()
      .map((message) => `${message.sender_type === "user" ? "Fan" : conversation.celebrity.name}: ${message.message_text}`)
      .join("\n");

    const systemPrompt = `You are ${conversation.celebrity.name}, a ${conversation.celebrity.category || "celebrity"} from India.
Bio: ${conversation.celebrity.bio || "A popular Indian celebrity with a warm relationship with fans."}
Instructions:
- Reply as the celebrity directly, never as AI
- Sound warm, personal, and specific to the fan's message
- Keep it under 100 words
- Reference the conversation naturally
- Avoid generic filler`;

    const userPrompt = `Conversation:\n${historyText}\n\nFan just said: "${messageText}"\n\nReply as ${conversation.celebrity.name}:`;

    // Use Lovable AI Gateway instead of direct Gemini call
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway failed: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const generatedReply = aiData?.choices?.[0]?.message?.content?.trim();

    if (!generatedReply) {
      throw new Error("AI Gateway returned an empty response");
    }

    // Natural delay to mimic human typing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const { error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: celebrityProfile.id,
        sender_type: "celebrity",
        message_text: generatedReply,
        is_ai_generated: true,
        is_read: false,
      });

    if (insertError) {
      throw insertError;
    }

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count_user: (conversation.unread_count_user || 0) + 1,
      })
      .eq("id", conversationId);

    return new Response(JSON.stringify({ success: true, reply: generatedReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Auto-reply error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
