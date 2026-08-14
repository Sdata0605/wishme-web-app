import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_LANGUAGES = [
  { language: 'English', locale: 'en-US' },
  { language: 'Hindi', locale: 'hi-IN' },
  { language: 'Spanish', locale: 'es-ES' },
  { language: 'French', locale: 'fr-FR' },
  { language: 'German', locale: 'de-DE' },
  { language: 'Portuguese', locale: 'pt-BR' },
  { language: 'Italian', locale: 'it-IT' },
  { language: 'Chinese', locale: 'zh-CN' },
  { language: 'Japanese', locale: 'ja-JP' },
  { language: 'Korean', locale: 'ko-KR' },
  { language: 'Turkish', locale: 'tr-TR' },
  { language: 'Dutch', locale: 'nl-NL' },
  { language: 'Polish', locale: 'pl-PL' },
  { language: 'Arabic', locale: 'ar-SA' },
  { language: 'Indonesian', locale: 'id-ID' },
  { language: 'Russian', locale: 'ru-RU' },
  { language: 'Swedish', locale: 'sv-SE' },
  { language: 'Thai', locale: 'th-TH' },
  { language: 'Vietnamese', locale: 'vi-VN' },
  { language: 'Filipino', locale: 'fil-PH' },
  { language: 'Malay', locale: 'ms-MY' },
  { language: 'Romanian', locale: 'ro-RO' },
  { language: 'Ukrainian', locale: 'uk-UA' },
  { language: 'Greek', locale: 'el-GR' },
  { language: 'Czech', locale: 'cs-CZ' },
  { language: 'Finnish', locale: 'fi-FI' },
  { language: 'Danish', locale: 'da-DK' },
  { language: 'Bulgarian', locale: 'bg-BG' },
  { language: 'Croatian', locale: 'hr-HR' },
  { language: 'Slovak', locale: 'sk-SK' },
  { language: 'Tamil', locale: 'ta-IN' },
  { language: 'Telugu', locale: 'te-IN' },
  { language: 'Kannada', locale: 'kn-IN' },
  { language: 'Malayalam', locale: 'ml-IN' },
  { language: 'Bengali', locale: 'bn-IN' },
  { language: 'Marathi', locale: 'mr-IN' },
  { language: 'Gujarati', locale: 'gu-IN' },
  { language: 'Punjabi', locale: 'pa-IN' },
  { language: 'Urdu', locale: 'ur-PK' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    if (!heygenApiKey) {
      console.log('No HEYGEN_API_KEY, returning fallback languages');
      return new Response(
        JSON.stringify({ languages: FALLBACK_LANGUAGES, source: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.heygen.com/v2/voices', {
      headers: { 'X-Api-Key': heygenApiKey },
    });

    if (!res.ok) {
      console.error('HeyGen voices API error:', res.status);
      return new Response(
        JSON.stringify({ languages: FALLBACK_LANGUAGES, source: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const voices = data.data?.voices || [];

    // Extract unique language-locale pairs
    const langMap = new Map<string, string>();
    for (const voice of voices) {
      const lang = voice.language;
      const locale = voice.locale;
      if (lang && locale && !langMap.has(lang)) {
        langMap.set(lang, locale);
      }
    }

    const languages = Array.from(langMap.entries())
      .map(([language, locale]) => ({ language, locale }))
      .sort((a, b) => a.language.localeCompare(b.language));

    // Use API result if we got languages, otherwise fallback
    const result = languages.length > 5 ? languages : FALLBACK_LANGUAGES;

    return new Response(
      JSON.stringify({ languages: result, source: languages.length > 5 ? 'api' : 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching HeyGen languages:', error);
    return new Response(
      JSON.stringify({ languages: FALLBACK_LANGUAGES, source: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
