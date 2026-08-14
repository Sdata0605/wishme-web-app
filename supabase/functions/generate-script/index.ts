import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { openRouterText } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both formats: direct prompt OR context-based generation
    let finalPrompt: string;
    
    if (body.prompt && typeof body.prompt === 'string' && body.prompt.trim().length > 0) {
      // Direct prompt from ScriptBuilderStep
      finalPrompt = body.prompt;
    } else if (body.context) {
      // Context-based generation from BookingDetailsDialog
      const celebrityName = body.celebrityName || 'the celebrity';
      let parsedContext: any = {};
      
      try {
        parsedContext = typeof body.context === 'string' ? JSON.parse(body.context) : body.context;
      } catch {
        parsedContext = { message: body.context };
      }
      
      const requestDetails = parsedContext.requestDetails || parsedContext.step1 || {};
      const scriptBuilder = parsedContext.scriptBuilder || parsedContext.step4 || {};
      const creativeGuidelines = parsedContext.creativeGuidelines || parsedContext.step3 || {};
      const recipientName = requestDetails.recipientName || 'the recipient';
      const occasion = requestDetails.occasion || 'special occasion';
      const message = requestDetails.message || scriptBuilder.talkingPoints || scriptBuilder.scriptText || '';
      const goal = creativeGuidelines.goal || '';
      const toneAndStyle = creativeGuidelines.toneAndStyle || creativeGuidelines.tone || '';
      
      finalPrompt = `Generate a warm, personalized video script for ${celebrityName} to deliver.
      
Recipient: ${recipientName}
Occasion: ${occasion}
Key message/talking points: ${message || 'Make it warm and heartfelt'}
Goal: ${goal || 'Create a memorable personal message'}
Tone: ${toneAndStyle || 'Warm and friendly'}

Create a natural, engaging script (30-60 seconds when spoken) that:
- Addresses the recipient by name
- References the occasion naturally
- Incorporates the key message/talking points
- Feels authentic and personal
- Ends with a warm closing`;
    } else if (body.requestDetails || body.celebrityName) {
      const celebrityName = body.celebrityName || 'the celebrity';
      const requestDetails = body.requestDetails || {};
      const creativeGuidelines = body.creativeGuidelines || {};
      const talkingPoints = body.talkingPoints || '';
      finalPrompt = `Generate a ${body.serviceType || 'video'} script for ${celebrityName} based on the following details:
      
      Service Type: ${body.serviceType || 'video'}
      Celebrity: ${celebrityName}
      Talking Points: ${talkingPoints}
      Request Details: ${JSON.stringify(requestDetails)}
      Creative Guidelines: ${JSON.stringify(creativeGuidelines)}
      
      Create a natural, engaging script that incorporates these elements while maintaining ${celebrityName}'s personality and style.`;
    } else {
      throw new Error('Either prompt or context is required');
    }

    console.log('Generating script with prompt length:', finalPrompt.length);

    let script = await openRouterText(
      `You are a professional script writer for personalized celebrity video messages.

CRITICAL INSTRUCTIONS:
- Output ONLY the spoken script text - nothing else
- Do NOT include any headers, labels, or formatting (no "Script:", "Opening:", etc.)
- Do NOT include stage directions, notes, or instructions
- Do NOT include quotation marks around the script
- The output will be directly fed to a text-to-speech system, so every word you write will be spoken
- Write in a natural, conversational tone as if the celebrity is speaking directly to the recipient

${finalPrompt}`,
      { maxTokens: 500, temperature: 0.7 },
    );
    
    // Clean up the script - remove any formatting artifacts
    script = script
      .replace(/^(Script|Opening|Greeting|Message|Closing|Body|Intro|Outro|Note|Instructions?):\s*/gim, '')
      .replace(/^\*\*.*?\*\*\s*/gm, '') // Remove markdown bold headers
      .replace(/^#.*$/gm, '') // Remove markdown headers
      .replace(/^\[.*?\]\s*/gm, '') // Remove bracketed stage directions
      .replace(/^\(.*?\)\s*/gm, '') // Remove parenthetical notes
      .replace(/^[-•]\s*/gm, '') // Remove bullet points
      .replace(/"/g, '') // Remove quotation marks
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();

    return new Response(
      JSON.stringify({ script }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating script:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
