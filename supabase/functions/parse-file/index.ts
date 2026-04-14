import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Brak autoryzacji" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nieautoryzowany" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== "string") {
      return new Response(JSON.stringify({ error: "Wymagane pole: filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the file belongs to the user
    if (!filePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "Brak dostępu do pliku" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chat-files")
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `Nie udało się pobrać pliku: ${downloadError?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileName = filePath.split("/").pop() || "file";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    // Text-based files - read directly
    const textExtensions = new Set([
      "txt", "md", "csv", "json", "xml", "yaml", "yml", "toml",
      "html", "css", "js", "ts", "jsx", "tsx", "py", "rb", "go",
      "java", "c", "cpp", "h", "rs", "sql", "sh", "bash", "env",
      "log", "ini", "cfg", "conf", "dockerfile", "makefile",
    ]);

    let extractedText = "";
    let fileType = "unknown";

    if (textExtensions.has(ext)) {
      extractedText = await fileData.text();
      fileType = "text";
    } else if (ext === "pdf") {
      // For PDF, use the AI model to summarize/extract
      fileType = "pdf";
      // Convert to base64 for potential AI processing
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      // Simple text extraction attempt
      extractedText = extractTextFromPDFBytes(bytes);
      if (!extractedText.trim()) {
        extractedText = `[Plik PDF: ${fileName} - nie udało się wyodrębnić tekstu. Plik może zawierać obrazy lub zeskanowany tekst.]`;
      }
    } else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      fileType = "image";
      extractedText = `[Obraz: ${fileName} - przesłany do analizy]`;
    } else {
      // Try reading as text
      try {
        extractedText = await fileData.text();
        fileType = "text";
      } catch {
        extractedText = `[Plik binarny: ${fileName} - nie można odczytać jako tekst]`;
        fileType = "binary";
      }
    }

    // Truncate very large files
    const MAX_CHARS = 50000;
    if (extractedText.length > MAX_CHARS) {
      extractedText = extractedText.substring(0, MAX_CHARS) + `\n\n[... Plik obcięty do ${MAX_CHARS} znaków z ${extractedText.length}]`;
    }

    return new Response(
      JSON.stringify({
        text: extractedText,
        fileName,
        fileType,
        charCount: extractedText.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-file error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Basic PDF text extraction from raw bytes
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  const text: string[] = [];
  const str = new TextDecoder("latin1").decode(bytes);

  // Extract text between BT and ET markers (basic PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      text.push(tjMatch[1]);
    }
    // TJ array
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const parts = inner.match(/\(([^)]*)\)/g);
      if (parts) {
        text.push(parts.map(p => p.slice(1, -1)).join(""));
      }
    }
  }

  return text.join(" ").replace(/\\n/g, "\n").replace(/\\r/g, "");
}
