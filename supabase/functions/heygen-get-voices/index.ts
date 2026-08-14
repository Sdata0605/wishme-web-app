const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
    if (!HEYGEN_API_KEY) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    console.log("Fetching HeyGen voices...");

    // Try the v2 voices endpoint first
    let response = await fetch("https://api.heygen.com/v2/voices", {
      method: "GET",
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
    });

    // If v2 fails, try v1 endpoint as fallback
    if (!response.ok) {
      console.log(`V2 API returned ${response.status}, trying v1 fallback...`);
      response = await fetch("https://api.heygen.com/v1/voice.list", {
        method: "GET",
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Content-Type": "application/json",
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HeyGen API error:", response.status, errorText);
      
      // Return cached/default voices if API is temporarily unavailable
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        console.log("HeyGen API temporarily unavailable, returning default voices");
        return new Response(JSON.stringify({ 
          voices: [
            { voice_id: "f38a635bee7a4d1f9b0a654a31d050d2", voice_name: "Chill Brian", language: "en-US", gender: "male" },
            { voice_id: "1bd001e7e50f421d891986aad5158bc8", voice_name: "Friendly Sarah", language: "en-US", gender: "female" },
            { voice_id: "a0e99841e9934b7dbc1a8e3d33b0c8bb", voice_name: "Professional James", language: "en-US", gender: "male" },
          ],
          cached: true,
          message: "HeyGen API temporarily unavailable - showing default voices"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`HeyGen API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("HeyGen voices response received");
    
    // Transform the response to a simpler format
    // Handle both v1 and v2 response formats
    const voicesArray = data.data?.voices || data.data?.list || data.voices || [];
    
    const voices = voicesArray.map((voice: any) => ({
      voice_id: voice.voice_id || voice.id,
      voice_name: voice.name || voice.display_name || voice.voice_name || voice.voice_id,
      language: voice.language || voice.locale || "en-US",
      gender: voice.gender || "unknown",
      preview_audio: voice.preview_audio || voice.sample_url,
    }));

    console.log(`Found ${voices.length} voices`);

    return new Response(JSON.stringify({ voices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching HeyGen voices:", error);
    
    // Return default voices on error to prevent UI from breaking
    return new Response(
      JSON.stringify({ 
        voices: [
          { voice_id: "f38a635bee7a4d1f9b0a654a31d050d2", voice_name: "Chill Brian", language: "en-US", gender: "male" },
          { voice_id: "1bd001e7e50f421d891986aad5158bc8", voice_name: "Friendly Sarah", language: "en-US", gender: "female" },
        ],
        cached: true,
        error: error.message 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
