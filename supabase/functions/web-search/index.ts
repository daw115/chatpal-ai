import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Wymagane pole: query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const QUATARLY_API_KEY = Deno.env.get("QUATARLY_API_KEY");
    if (!QUATARLY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "QUATARLY_API_KEY nie jest skonfigurowany" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a web search assistant. Given a user query, return exactly 6 search results as JSON.

Return a JSON object with a "results" key containing an array. Each item has:
- "title": descriptive page title
- "url": full realistic URL to a real website
- "snippet": 2-3 sentences with factual information relevant to the query

Example response format:
{"results":[{"title":"Example Title","url":"https://example.com/page","snippet":"Description here."}]}

Respond with ONLY the JSON object. No markdown code fences. No extra text.`;

    const response = await fetch("https://api.quatarly.cloud/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${QUATARLY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Search query: "${query}"` },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Quatarly API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON response, stripping markdown fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let results: SearchResult[] = [];
    console.log("Raw content:", content.substring(0, 500));
    console.log("Cleaned:", cleaned.substring(0, 500));
    try {
      const parsed = JSON.parse(cleaned);
      results = Array.isArray(parsed) ? parsed : (parsed.results || []);
    } catch (err) {
      console.error("Failed to parse search results:", err, cleaned.substring(0, 300));
      results = [];
    }

    return new Response(
      JSON.stringify({ results, query }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("web-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
