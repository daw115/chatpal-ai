import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PISTON_URL = "https://emkc.org/api/v2/piston";

// Map common language names to Piston language identifiers
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  python3: { language: "python", version: "3.10.0" },
  py: { language: "python", version: "3.10.0" },
  javascript: { language: "javascript", version: "18.15.0" },
  js: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  ts: { language: "typescript", version: "5.0.3" },
  java: { language: "java", version: "15.0.2" },
  c: { language: "c", version: "10.2.0" },
  cpp: { language: "c++", version: "10.2.0" },
  "c++": { language: "c++", version: "10.2.0" },
  csharp: { language: "csharp.net", version: "5.0.201" },
  "c#": { language: "csharp.net", version: "5.0.201" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
  ruby: { language: "ruby", version: "3.0.1" },
  php: { language: "php", version: "8.2.3" },
  bash: { language: "bash", version: "5.2.0" },
  sh: { language: "bash", version: "5.2.0" },
  sql: { language: "sqlite3", version: "3.36.0" },
  kotlin: { language: "kotlin", version: "1.8.20" },
  swift: { language: "swift", version: "5.3.3" },
  r: { language: "r", version: "4.1.1" },
  perl: { language: "perl", version: "5.36.0" },
  lua: { language: "lua", version: "5.4.4" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language, code, stdin } = await req.json();

    if (!language || !code) {
      return new Response(
        JSON.stringify({ error: "Wymagane pola: language, code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langKey = language.toLowerCase().trim();
    const langConfig = LANGUAGE_MAP[langKey];

    if (!langConfig) {
      return new Response(
        JSON.stringify({
          error: `Nieobsługiwany język: ${language}`,
          supported: Object.keys(LANGUAGE_MAP),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    const response = await fetch(`${PISTON_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: `main`, content: code }],
        stdin: stdin || "",
        run_timeout: 10000, // 10s max
        compile_timeout: 10000,
        compile_memory_limit: 256000000, // 256MB
        run_memory_limit: 256000000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Piston error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Piston API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        stdout: result.run?.stdout || "",
        stderr: result.run?.stderr || result.compile?.stderr || "",
        exitCode: result.run?.code ?? -1,
        language: langConfig.language,
        version: langConfig.version,
        executionTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("run-code error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
