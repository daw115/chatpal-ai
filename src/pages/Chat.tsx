import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput, type UploadedFile } from "@/components/ChatInput";
import { ModelSelector } from "@/components/ModelSelector";
import { AgentSelector } from "@/components/AgentSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExportConversation } from "@/components/ExportConversation";
import { UserSettings, loadUserSettings } from "@/components/UserSettings";
import { streamChat } from "@/lib/streamChat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Agent, getAgent } from "@/lib/agents";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  agent_id: string | null;
  updated_at: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState(() => loadUserSettings().defaultModel);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(() => {
    const s = loadUserSettings();
    return getAgent(s.defaultAgentId) || null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, model, agent_id, updated_at")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
      const conv = conversations.find(c => c.id === activeId);
      if (conv) {
        setModel(conv.model);
        setSelectedAgent(getAgent(conv.agent_id) || null);
      }
    };
    load();
  }, [activeId, conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNew = () => {
    setActiveId(null);
    setMessages([]);
    const s = loadUserSettings();
    setModel(s.defaultModel);
    setSelectedAgent(getAgent(s.defaultAgentId) || null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (activeId === id) handleNew();
    loadConversations();
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const uploadAndParseFiles = async (files: UploadedFile[], userId: string): Promise<{ text: string; images: { base64: string; mimeType: string }[] }> => {
    const results: string[] = [];
    const images: Array<{ base64: string; mimeType: string }> = [];

    for (const f of files) {
      // If image, convert to base64 for multimodal
      if (f.file.type.startsWith("image/")) {
        try {
          const base64 = await fileToBase64(f.file);
          images.push({ base64, mimeType: f.file.type });
        } catch {
          results.push(`[Błąd odczytu obrazu: ${f.file.name}]`);
        }
        continue;
      }

      const filePath = `${userId}/${Date.now()}-${f.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, f.file);

      if (uploadError) {
        results.push(`[Błąd uploadu: ${f.file.name} - ${uploadError.message}]`);
        continue;
      }

      try {
        const resp = await supabase.functions.invoke("parse-file", {
          body: { filePath },
        });

        if (resp.error) {
          results.push(`[Błąd parsowania: ${f.file.name}]`);
        } else {
          const data = resp.data as { text: string; fileName: string; fileType: string };
          results.push(`--- Plik: ${data.fileName} (${data.fileType}) ---\n${data.text}`);
        }
      } catch {
        results.push(`[Błąd parsowania: ${f.file.name}]`);
      }
    }

    return { text: results.join("\n\n"), images };
  };

  const sendMessages = async (messagesToSend: Message[], input: string, files?: UploadedFile[]) => {
    if (!user) return;

    setIsStreaming(true);
    let convId = activeId;

    if (!convId) {
      const agentId = selectedAgent?.id || "general";
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: loadUserSettings().autoTitle ? input.slice(0, 100) : "Nowa rozmowa", model, agent_id: agentId })
        .select("id")
        .single();
      if (!data) {
        toast({ variant: "destructive", title: "Błąd", description: "Nie udało się utworzyć konwersacji" });
        setIsStreaming(false);
        return;
      }
      convId = data.id;
      setActiveId(convId);
    }

    // Parse files and build context
    let fileContext = "";
    let imageData: Array<{ base64: string; mimeType: string }> = [];
    if (files?.length) {
      const parsed = await uploadAndParseFiles(files, user.id);
      fileContext = parsed.text;
      imageData = parsed.images;
    }

    // Build messages with system prompt
    const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string | Array<unknown> }> = [];
    const agent = selectedAgent || getAgent("general");
    if (agent?.systemPrompt) {
      chatMessages.push({ role: "system", content: agent.systemPrompt });
    }

    // Add previous messages (all except last user msg)
    const prevMessages = messagesToSend.slice(0, -1);
    chatMessages.push(...prevMessages.map(m => ({ role: m.role, content: m.content })));

    // Build the last user message with images if present
    const lastUserMsg = messagesToSend[messagesToSend.length - 1];
    const textContent = fileContext
      ? `${lastUserMsg.content}\n\n<attached-files>\n${fileContext}\n</attached-files>`
      : lastUserMsg.content;

    if (imageData.length > 0) {
      // Multimodal message format
      const parts: Array<unknown> = [{ type: "text", text: textContent }];
      for (const img of imageData) {
        parts.push({
          type: "image_url",
          image_url: { url: img.base64 },
        });
      }
      chatMessages.push({ role: "user", content: parts });
    } else {
      chatMessages.push({ role: "user", content: textContent });
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: chatMessages as Array<{ role: "user" | "assistant" | "system"; content: string }>,
        model,
        onDelta: updateAssistant,
        onDone: async () => {
          setIsStreaming(false);
          abortRef.current = null;
          if (assistantContent && convId) {
            await supabase.from("messages").insert({
              conversation_id: convId,
              role: "assistant",
              content: assistantContent,
            });
            loadConversations();
          }
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Błąd", description: err });
          setIsStreaming(false);
        },
        signal: controller.signal,
      });
    } catch {
      setIsStreaming(false);
    }
  };

  const handleSend = async (input: string, files?: UploadedFile[]) => {
    if (!user) return;

    const displayContent = files?.length
      ? `${input}\n\n📎 Załączniki: ${files.map(f => f.file.name).join(", ")}`
      : input;

    const userMsg: Message = { role: "user", content: displayContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Save user message
    if (activeId) {
      await supabase.from("messages").insert({
        conversation_id: activeId,
        role: "user",
        content: displayContent,
      });
      await supabase.from("conversations").update({ updated_at: new Date().toISOString(), model }).eq("id", activeId);
    }

    await sendMessages(newMessages, input, files);
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (!activeId || isStreaming) return;

    // Trim messages after edited one
    const trimmed = messages.slice(0, index);
    const editedMsg: Message = { role: "user", content: newContent };
    const newMessages = [...trimmed, editedMsg];
    setMessages(newMessages);

    // Delete messages from DB after the edit point and re-insert
    // We need to get all message IDs
    const { data: dbMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true });

    if (dbMessages && dbMessages.length > index) {
      const idsToDelete = dbMessages.slice(index).map(m => m.id);
      for (const id of idsToDelete) {
        await supabase.from("messages").delete().eq("id", id);
      }
    }

    // Insert edited message
    await supabase.from("messages").insert({
      conversation_id: activeId,
      role: "user",
      content: newContent,
    });

    await sendMessages(newMessages, newContent);
  };

  const handleRegenerate = async () => {
    if (!activeId || isStreaming || messages.length < 2) return;

    // Remove last assistant message
    const trimmed = messages.slice(0, -1);
    setMessages(trimmed);

    // Delete last assistant message from DB
    const { data: dbMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true });

    if (dbMessages && dbMessages.length > 0) {
      const lastId = dbMessages[dbMessages.length - 1].id;
      await supabase.from("messages").delete().eq("id", lastId);
    }

    const lastUserMsg = trimmed[trimmed.length - 1];
    await sendMessages(trimmed, lastUserMsg.content);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const activeAgent = selectedAgent || (activeId ? getAgent(conversations.find(c => c.id === activeId)?.agent_id || null) : null);
  const AgentIcon = activeAgent?.icon || Bot;
  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={cn(
        "fixed z-40 h-full transition-transform md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
          onNew={() => { handleNew(); setSidebarOpen(false); }}
          onDelete={handleDelete}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {activeAgent && (
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-white", activeAgent.color)}>
              <AgentIcon className="h-4 w-4" />
            </div>
          )}
          {activeAgent && <span className="text-sm font-medium">{activeAgent.name}</span>}
          <div className="ml-auto flex items-center gap-1">
            <ExportConversation
              title={activeConv?.title || "Konwersacja"}
              messages={messages}
              agentName={activeAgent?.name}
            />
            <UserSettings onSettingsChange={(s) => {
              if (!activeId) {
                setModel(s.defaultModel);
                setSelectedAgent(getAgent(s.defaultAgentId) || null);
              }
            }} />
            <ThemeToggle />
            <ModelSelector value={model} onChange={setModel} />
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !activeId && !selectedAgent ? (
            <AgentSelector onSelect={handleAgentSelect} />
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white", activeAgent?.color || "bg-primary")}>
                <AgentIcon className="h-6 w-6" />
              </div>
              <p className="text-lg">{activeAgent?.name || "Jak mogę Ci pomóc?"}</p>
              <p className="text-sm">{activeAgent?.description}</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  isLast={i === messages.length - 1}
                  isStreaming={isStreaming}
                  onEdit={m.role === "user" ? (newContent) => handleEditMessage(i, newContent) : undefined}
                  onRegenerate={m.role === "assistant" && i === messages.length - 1 ? handleRegenerate : undefined}
                />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 px-4 py-6 bg-muted/30">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white", activeAgent?.color || "bg-secondary")}>
                    <AgentIcon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} onStop={handleStop} isLoading={isStreaming} />
      </div>
    </div>
  );
}
