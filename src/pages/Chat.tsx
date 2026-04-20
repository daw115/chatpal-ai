import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput, type UploadedFile } from "@/components/ChatInput";
import { ModelSelector } from "@/components/ModelSelector";
import { AgentSelector } from "@/components/AgentSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExportConversation } from "@/components/ExportConversation";
import { UserSettings, loadUserSettings } from "@/components/UserSettings";
import { UsageStats } from "@/components/UsageStats";
import { DataPortability } from "@/components/DataPortability";
import { AgentChainEditor, type AgentChain } from "@/components/AgentChainEditor";
import { NotesPanel, extractAndSaveNotes } from "@/components/NotesPanel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS, type Agent, getAgent } from "@/lib/agents";

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
  pinned?: boolean;
  folder_id?: string | null;
  shared_token?: string | null;
}

interface ConversationFolder {
  id: string;
  name: string;
  color: string;
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
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState(() => loadUserSettings().defaultModel);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(() => {
    const s = loadUserSettings();
    return getAgent(s.defaultAgentId) || null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [chainProgress, setChainProgress] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConversations();
      setConversations(data as Conversation[]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [user]);

  const loadFolders = useCallback(async () => {
    if (!user) return;
    // Folders not yet implemented in Express API
    setFolders([]);
  }, [user]);

  useEffect(() => { loadConversations(); loadFolders(); }, [loadConversations, loadFolders]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const load = async () => {
      try {
        const data = await api.getMessages(activeId);
        setMessages(data as Message[]);
        const conv = conversations.find(c => c.id === activeId);
        if (conv) {
          setModel(conv.model);
          setSelectedAgent(getAgent(conv.agent_id) || null);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
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
    try {
      await api.deleteConversation(id);
      if (activeId === id) handleNew();
      loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleRename = async (id: string, title: string) => {
    // Not yet implemented in Express API
    console.log('Rename not yet implemented');
  };

  const handlePin = async (id: string, pinned: boolean) => {
    // Not yet implemented in Express API
    console.log('Pin not yet implemented');
  };

  const handleMoveToFolder = async (convId: string, folderId: string | null) => {
    // Folders not yet implemented in Express API
    console.log('Move to folder not yet implemented');
  };

  const handleCreateFolder = async (name: string, color: string) => {
    // Folders not yet implemented in Express API
    console.log('Create folder not yet implemented');
  };

  const handleDeleteFolder = async (id: string) => {
    // Folders not yet implemented in Express API
    console.log('Delete folder not yet implemented');
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    // Apply custom agent's default model if available
    if ((agent as any)._defaultModel) {
      setModel((agent as any)._defaultModel);
    }
  };

  const uploadAndParseFiles = async (files: UploadedFile[], userId: string): Promise<{ text: string; images: { base64: string; mimeType: string }[] }> => {
    const results: string[] = [];
    const images: Array<{ base64: string; mimeType: string }> = [];

    for (const f of files) {
      if (f.file.type.startsWith("image/")) {
        try {
          const base64 = await fileToBase64(f.file);
          images.push({ base64, mimeType: f.file.type });
        } catch {
          results.push(`[Błąd odczytu obrazu: ${f.file.name}]`);
        }
        continue;
      }

      // File upload not yet implemented in Express API
      results.push(`[Upload plików nie jest jeszcze zaimplementowany: ${f.file.name}]`);
    }

    return { text: results.join("\n\n"), images };
  };

  const sendMessages = async (messagesToSend: Message[], input: string, files?: UploadedFile[]) => {
    if (!user) return;

    setIsStreaming(true);
    let convId = activeId;

    if (!convId) {
      const agentId = selectedAgent?.id || "general";
      try {
        const data = await api.createConversation(
          loadUserSettings().autoTitle ? input.slice(0, 100) : "Nowa rozmowa",
          model,
          agentId
        );
        convId = data.id;
        setActiveId(convId);

        // Save the user message for newly created conversations
        const lastMsg = messagesToSend[messagesToSend.length - 1];
        if (lastMsg?.role === "user") {
          await api.createMessage(convId, "user", lastMsg.content);
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Błąd", description: "Nie udało się utworzyć konwersacji" });
        setIsStreaming(false);
        return;
      }
    }

    let fileContext = "";
    let imageData: Array<{ base64: string; mimeType: string }> = [];
    if (files?.length) {
      const parsed = await uploadAndParseFiles(files, user.id);
      fileContext = parsed.text;
      imageData = parsed.images;
    }

    const chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string | Array<unknown> }> = [];
    const agent = selectedAgent || getAgent("general");

    // Inject agent system prompt
    if (agent?.systemPrompt) {
      chatMessages.push({ role: "system", content: agent.systemPrompt });
    }

    // Inject custom instructions
    const settings = loadUserSettings();
    if (settings.customInstructions.trim()) {
      chatMessages.push({ role: "system", content: settings.customInstructions.trim() });
    }

    // Note-saving instructions
    chatMessages.push({
      role: "system",
      content: `Gdy użytkownik poprosi o zapisanie notatki, TODO lub przypomnienia, dodaj na końcu odpowiedzi marker w formacie:
[SAVE_NOTE: tytuł] lub [SAVE_TODO: tytuł] lub [SAVE_REMINDER: tytuł | termin: YYYY-MM-DD]
Możesz dodać treść po tytule oddzieloną |, np. [SAVE_TODO: Kupić mleko | Na jutro rano]
Możesz dodać wiele markerów. Nie dodawaj markerów jeśli użytkownik nie prosi o zapisanie.`,
    });

    const prevMessages = messagesToSend.slice(0, -1);
    chatMessages.push(...prevMessages.map(m => ({ role: m.role, content: m.content })));

    const lastUserMsg = messagesToSend[messagesToSend.length - 1];
    const textContent = fileContext
      ? `${lastUserMsg.content}\n\n<attached-files>\n${fileContext}\n</attached-files>`
      : lastUserMsg.content;

    if (imageData.length > 0) {
      const parts: Array<unknown> = [{ type: "text", text: textContent }];
      for (const img of imageData) {
        parts.push({ type: "image_url", image_url: { url: img.base64 } });
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
      await api.streamChat({
        messages: chatMessages as Array<{ role: "user" | "assistant" | "system"; content: string }>,
        model,
        conversationId: convId || undefined,
        onDelta: updateAssistant,
        onDone: async () => {
          setIsStreaming(false);
          abortRef.current = null;
          if (assistantContent && convId) {
            await api.createMessage(convId, "assistant", assistantContent);
            // Extract and save notes/todos/reminders from response
            if (user) {
              extractAndSaveNotes(assistantContent, user.id);
            }
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

    if (activeId) {
      await api.createMessage(activeId, "user", displayContent);
    }

    await sendMessages(newMessages, input, files);
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (!activeId || isStreaming) return;

    const trimmed = messages.slice(0, index);
    const editedMsg: Message = { role: "user", content: newContent };
    const newMessages = [...trimmed, editedMsg];
    setMessages(newMessages);

    // Message editing with deletion not yet fully implemented in Express API
    // For now, just send the new message
    await api.createMessage(activeId, "user", newContent);
    await sendMessages(newMessages, newContent);
  };

  const handleRegenerate = async () => {
    if (!activeId || isStreaming || messages.length < 2) return;

    const trimmed = messages.slice(0, -1);
    setMessages(trimmed);

    // Message deletion not yet implemented in Express API
    // Just regenerate with existing messages
    const lastUserMsg = trimmed[trimmed.length - 1];
    await sendMessages(trimmed, lastUserMsg.content);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setChainProgress(null);
  };

  /** Resolve an agent by ID (built-in or custom from AgentChainEditor) */
  const resolveAgentById = (agentId: string): Agent | undefined => {
    // Built-in agents
    const builtin = AGENTS.find(a => a.id === agentId);
    if (builtin) return builtin;
    // Custom agents use "custom:<uuid>" format
    return getAgent(agentId) || undefined;
  };

  /** Run a chain: user input → agent1 → agent2 → ... → agentN */
  const handleChainRun = async (chain: AgentChain) => {
    if (!user || isStreaming) return;

    // Find the last user message as chain input
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");

    if (!lastUserMsg) {
      toast({ variant: "destructive", title: "Błąd", description: "Najpierw wyślij wiadomość, która będzie wejściem łańcucha." });
      return;
    }

    setIsStreaming(true);
    let currentInput = lastUserMsg.content;

    // Create conversation if needed
    let convId = activeId;
    if (!convId) {
      try {
        const data = await api.createConversation(`Łańcuch: ${chain.name}`, model);
        convId = data.id;
        setActiveId(convId);
      } catch (error) {
        setIsStreaming(false);
        setChainProgress(null);
        return;
      }
    }

    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      const agent = resolveAgentById(step.agentId);
      const stepLabel = step.label || agent?.name || step.agentId;
      setChainProgress(`Krok ${i + 1}/${chain.steps.length}: ${stepLabel}`);

      const chatMsgs: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
      if (agent?.systemPrompt) {
        chatMsgs.push({ role: "system", content: agent.systemPrompt });
      }
      chatMsgs.push({
        role: "system",
        content: `Jesteś krokiem ${i + 1} z ${chain.steps.length} w łańcuchu agentów "${chain.name}". Przetwórz poniższe dane wejściowe zgodnie ze swoją specjalizacją i zwróć wynik.`,
      });
      chatMsgs.push({ role: "user", content: currentInput });

      // Show chain step header
      const stepHeader = `**🔗 ${stepLabel}** (krok ${i + 1}/${chain.steps.length})`;
      setMessages(prev => [...prev, { role: "assistant", content: stepHeader + "\n\n" }]);

      let stepContent = "";
      const controller = new AbortController();
      abortRef.current = controller;

      await new Promise<void>((resolve) => {
        api.streamChat({
          messages: chatMsgs,
          model: (agent as any)?._defaultModel || model,
          conversationId: convId || undefined,
          onDelta: (chunk) => {
            stepContent += chunk;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: stepHeader + "\n\n" + stepContent,
              };
              return updated;
            });
          },
          onDone: () => resolve(),
          onError: (err) => {
            toast({ variant: "destructive", title: "Błąd łańcucha", description: err });
            resolve();
          },
          signal: controller.signal,
        });
      });

      // Save step to DB
      if (convId && stepContent) {
        await api.createMessage(convId, "assistant", stepHeader + "\n\n" + stepContent);
      }

      // Next step uses this step's output
      currentInput = stepContent;

      // If aborted, stop chain
      if (controller.signal.aborted) break;
    }

    setIsStreaming(false);
    setChainProgress(null);
    loadConversations();
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
          onRename={handleRename}
          onPin={handlePin}
          onMoveToFolder={handleMoveToFolder}
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {activeAgent && (
            <div
              className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-white", activeAgent.color)}
              style={(activeAgent as any)._customColor ? { backgroundColor: (activeAgent as any)._customColor } : undefined}
            >
              <AgentIcon className="h-4 w-4" />
            </div>
          )}
          {activeAgent && <span className="text-sm font-medium">{activeAgent.name}</span>}
          <div className="ml-auto flex items-center gap-1">
            <ExportConversation
              title={activeConv?.title || "Konwersacja"}
              messages={messages}
              agentName={activeAgent?.name}
              conversationId={activeId}
              sharedToken={activeConv?.shared_token}
              onShareChange={loadConversations}
            />
            <UserSettings onSettingsChange={(s) => {
              if (!activeId) {
                setModel(s.defaultModel);
                setSelectedAgent(getAgent(s.defaultAgentId) || null);
              }
            }} />
            <AgentChainEditor onRun={handleChainRun} />
            <NotesPanel />
            <DataPortability />
            <UsageStats />
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

        {chainProgress && (
          <div className="flex items-center gap-2 px-4 py-1.5 border-t bg-muted/50 text-xs text-muted-foreground">
            <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
            {chainProgress}
          </div>
        )}
        <ChatInput onSend={handleSend} onStop={handleStop} isLoading={isStreaming} />
      </div>
    </div>
  );
}
