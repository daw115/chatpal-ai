import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_LANGUAGES = [
  "javascript", "js", "typescript", "ts", "python", "py", "python3",
];

function isJavaScript(lang: string): boolean {
  return ["javascript", "js", "typescript", "ts"].includes(lang.toLowerCase());
}

function isPython(lang: string): boolean {
  return ["python", "py", "python3"].includes(lang.toLowerCase());
}

async function executeJavaScript(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const logs: string[] = [];
  const errors: string[] = [];

  // Create a sandbox with captured console
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => errors.push(args.map(String).join(" ")),
      warn: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      info: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    },
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Promise,
    RegExp,
    Error,
    TypeError,
    RangeError,
    setTimeout: (fn: () => void, ms: number) => {
      if (ms > 5000) throw new Error("Timeout too long");
      return setTimeout(fn, ms);
    },
  };

  try {
    // Build function with sandbox globals
    const sandboxKeys = Object.keys(sandbox);
    const sandboxValues = Object.values(sandbox);
    
    const wrappedCode = `
      "use strict";
      return (async () => {
        ${code}
      })();
    `;
    
    const fn = new Function(...sandboxKeys, wrappedCode);
    const result = await Promise.race([
      fn(...sandboxValues),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: execution exceeded 10s")), 10000)),
    ]);

    // If the code returns a value and nothing was logged, show the return value
    if (result !== undefined && logs.length === 0) {
      logs.push(typeof result === "object" ? JSON.stringify(result, null, 2) : String(result));
    }

    return { stdout: logs.join("\n"), stderr: errors.join("\n"), exitCode: 0 };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return { stdout: logs.join("\n"), stderr: errMsg, exitCode: 1 };
  }
}

async function executePython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Use a simple Python interpreter approach - translate basic Python to JS
  // For real Python execution, we'd need a WASM Python runtime or external API
  // For now, use the Pyodide-like approach: basic Python via transpilation
  
  // Actually, let's try using Deno subprocess if available
  try {
    const process = new Deno.Command("python3", {
      args: ["-c", code],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code: exitCode, stdout, stderr } = await process.output();
    const decoder = new TextDecoder();
    
    return {
      stdout: decoder.decode(stdout),
      stderr: decoder.decode(stderr),
      exitCode,
    };
  } catch {
    return {
      stdout: "",
      stderr: "Python nie jest dostępny w tym środowisku. Obsługiwane: JavaScript/TypeScript.",
      exitCode: 1,
    };
  }
}

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

    const lang = language.toLowerCase().trim();
    const startTime = Date.now();
    let result: { stdout: string; stderr: string; exitCode: number };

    if (isJavaScript(lang)) {
      result = await executeJavaScript(code);
    } else if (isPython(lang)) {
      result = await executePython(code);
    } else {
      return new Response(
        JSON.stringify({
          error: `Język "${language}" nie jest obecnie obsługiwany w sandboxie. Obsługiwane: JavaScript, TypeScript, Python.`,
          supported: ["javascript", "typescript", "python"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        language: isJavaScript(lang) ? "javascript" : "python",
        version: isJavaScript(lang) ? "Deno" : "3.x",
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
