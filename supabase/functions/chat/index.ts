import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
      stream_options: { include_usage: true },
    }),
  });
}

function transformAnthropicStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          const usageEvent = { usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens } };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(usageEvent)}\n\n`));
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

            if (event.type === "message_start" && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
            }
            if (event.type === "message_delta" && event.usage) {
              outputTokens = event.usage.output_tokens || 0;
            }

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              const openaiChunk = {
                choices: [{ delta: { content: event.delta.text }, index: 0 }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            } else if (event.type === "message_stop") {
              const usageEvent = { usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens } };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(usageEvent)}\n\n`));
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
    const { messages, model, conversation_id } = await req.json();
    const QUATARLY_API_KEY = Deno.env.get("QUATARLY_API_KEY");
    if (!QUATARLY_API_KEY) {
      throw new Error("QUATARLY_API_KEY is not configured");
    }

    // Extract user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch { /* ignore */ }
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

    // For OpenAI-compatible streams, intercept to extract usage and log it
    if (!isClaude && response.body && userId) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = "";
      let promptTokens = 0;
      let completionTokens = 0;

      const transformed = new ReadableStream({
        async pull(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Log usage
              if (userId && (promptTokens > 0 || completionTokens > 0)) {
                logUsage(userId, selectedModel, promptTokens, completionTokens, conversation_id);
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                if (userId && (promptTokens > 0 || completionTokens > 0)) {
                  logUsage(userId, selectedModel, promptTokens, completionTokens, conversation_id);
                }
                // Send usage event before DONE
                const usageEvent = { usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens } };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(usageEvent)}\n\n`));
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                // Extract usage from the final chunk
                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens || promptTokens;
                  completionTokens = parsed.usage.completion_tokens || completionTokens;
                }
              } catch { /* skip */ }

              // Forward the line as-is
              controller.enqueue(encoder.encode(`${line}\n\n`));
            }
          }
        },
        cancel() { reader.cancel(); },
      });

      return new Response(transformed, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Claude streams - transform and log
    if (isClaude && response.body) {
      const transformedBody = transformAnthropicStream(response.body);
      
      // For Claude, we intercept the transformed stream to log usage
      if (userId) {
        const reader = transformedBody.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf2 = "";

        const loggingStream = new ReadableStream({
          async pull(controller) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                return;
              }

              const text = decoder.decode(value, { stream: true });
              buf2 += text;

              let idx: number;
              while ((idx = buf2.indexOf("\n")) !== -1) {
                const line = buf2.slice(0, idx).trim();
                buf2 = buf2.slice(idx + 1);

                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6).trim();
                
                if (jsonStr === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.usage) {
                    logUsage(userId!, selectedModel, parsed.usage.prompt_tokens || 0, parsed.usage.completion_tokens || 0, conversation_id);
                  }
                } catch { /* skip */ }

                controller.enqueue(encoder.encode(`${line}\n\n`));
              }
            }
          },
          cancel() { reader.cancel(); },
        });

        return new Response(loggingStream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      return new Response(transformedBody, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
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

function logUsage(userId: string, model: string, tokensIn: number, tokensOut: number, conversationId?: string) {
  // Fire and forget - don't block the stream
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  
  supabase.from("usage_logs").insert({
    user_id: userId,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    conversation_id: conversationId || null,
  }).then(({ error }) => {
    if (error) console.error("Failed to log usage:", error);
  });
}
