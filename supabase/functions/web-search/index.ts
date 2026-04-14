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

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SearchBot/1.0)",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo error: ${response.status}`);
  }

  const html = await response.text();
  const results: SearchResult[] = [];

  // Parse results from DuckDuckGo HTML lite
  // Each result is in a div with class "result"
  const resultBlocks = html.split('<div class="result results_links results_links_deep');

  for (let i = 1; i < resultBlocks.length && results.length < 8; i++) {
    const block = resultBlocks[i];

    // Extract title and URL from <a> tag
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    // Extract snippet
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    if (titleMatch) {
      let url = titleMatch[1];
      // DuckDuckGo wraps URLs in redirects
      const uddgMatch = url.match(/uddg=([^&]*)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }

      const title = titleMatch[2]
        .replace(/<\/?b>/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();

      const snippet = snippetMatch
        ? snippetMatch[1]
            .replace(/<\/?b>/g, "")
            .replace(/<[^>]+>/g, "")
            .trim()
        : "";

      if (title && url && url.startsWith("http")) {
        results.push({ title, url, snippet });
      }
    }
  }

  return results;
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

    const results = await searchDuckDuckGo(query);

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
