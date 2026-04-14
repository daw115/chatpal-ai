import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'prompt' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const QUATARLY_API_KEY = Deno.env.get("QUATARLY_API_KEY");
    if (!QUATARLY_API_KEY) {
      throw new Error("QUATARLY_API_KEY is not configured");
    }

    const response = await fetch("https://api.quatarly.cloud/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${QUATARLY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate an image based on this description: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Image generation failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract image from response - Gemini image models return base64 in the content
    const content = data.choices?.[0]?.message?.content;
    
    return new Response(
      JSON.stringify({ result: content, raw: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
