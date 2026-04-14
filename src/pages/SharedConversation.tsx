import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ChatMessage";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SharedConv {
  title: string;
  model: string;
  agent_id: string | null;
}

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const [conv, setConv] = useState<SharedConv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, title, model, agent_id")
        .eq("shared_token", token)
        .single();

      if (convError || !convData) {
        setError("Nie znaleziono konwersacji lub link wygasł.");
        setLoading(false);
        return;
      }

      setConv({ title: convData.title, model: convData.model, agent_id: convData.agent_id });

      const { data: msgData } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", convData.id)
        .order("created_at", { ascending: true });

      if (msgData) setMessages(msgData as Message[]);
      setLoading(false);
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Bot className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg">{error}</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Wróć do czatu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Bot className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-sm font-semibold">{conv?.title}</h1>
          <p className="text-xs text-muted-foreground">Udostępniona konwersacja • {conv?.model}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} />
        ))}
      </div>
    </div>
  );
}
