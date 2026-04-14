import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isClaudeModel(model: string): boolean {
  return model.startsWith("claude-");
}

async function handleClaudeRequest(messages: Array<{role: string; content: unknown}>, model: string, apiKey: string) {
  const systemMessages = messages.filter(m => m.role === "system");
  const nonSystemMessages = messages.filter(m => m.role !== "system");
  const systemPrompt = systemMessages.map(m => String(m.content)).join("\n") || undefined;

  const body: Record<string, unknown> = {
    model,
    messages: nonSystemMessages,
    max_tokens: 8192,
    stream: true,
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  return await fetch("https://api.quatarly.cloud/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
}

async function handleOpenAIRequest(messages: Array<{role: string; content: unknown}>, model: string, apiKey: string) {
  return await fetch("https://api.quatarly.cloud/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });
}

function transformAnthropicStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              const openaiChunk = {
                choices: [{ delta: { content: event.delta.text }, index: 0 }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            } else if (event.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
          } catch {
            // skip unparseable
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    const QUATARLY_API_KEY = Deno.env.get("QUATARLY_API_KEY");
    if (!QUATARLY_API_KEY) {
      throw new Error("QUATARLY_API_KEY is not configured");
    }

    const selectedModel = model || "gemini-3-flash";
    const isClaude = isClaudeModel(selectedModel);

    const response = isClaude
      ? await handleClaudeRequest(messages, selectedModel, QUATARLY_API_KEY)
      : await handleOpenAIRequest(messages, selectedModel, QUATARLY_API_KEY);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Quatarly error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Brak środków na koncie Quatarly. Doładuj konto." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Quatarly error: ${response.status} - ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseBody = isClaude && response.body
      ? transformAnthropicStream(response.body)
      : response.body;

    return new Response(responseBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
