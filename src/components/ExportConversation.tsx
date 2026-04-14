import { Download, Copy, Check, Share2, Link, Link2Off } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExportConversationProps {
  title: string;
  messages: Message[];
  agentName?: string;
  conversationId?: string | null;
  sharedToken?: string | null;
  onShareChange?: () => void;
}

function toMarkdown(title: string, messages: Message[], agentName?: string): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push(`*Data: ${new Date().toLocaleString("pl-PL")}*`);
  if (agentName) lines.push(`*Agent: ${agentName}*`);
  lines.push("");

  for (const m of messages) {
    lines.push(m.role === "user" ? "## 👤 Użytkownik" : "## 🤖 Asystent");
    lines.push("");
    lines.push(m.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

export function ExportConversation({ title, messages, agentName, conversationId, sharedToken, onShareChange }: ExportConversationProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (messages.length === 0) return null;

  const md = toMarkdown(title, messages, agentName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/g, "").slice(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!conversationId) return;
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("conversations")
      .update({ shared_token: token })
      .eq("id", conversationId);

    if (error) {
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się udostępnić konwersacji" });
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link skopiowany!", description: "Każdy z linkiem może odczytać tę konwersację." });
    onShareChange?.();
  };

  const handleUnshare = async () => {
    if (!conversationId) return;
    await supabase
      .from("conversations")
      .update({ shared_token: null })
      .eq("id", conversationId);
    toast({ title: "Udostępnianie wyłączone" });
    onShareChange?.();
  };

  const handleCopyShareLink = async () => {
    if (!sharedToken) return;
    const shareUrl = `${window.location.origin}/shared/${sharedToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link skopiowany!" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Eksportuj / Udostępnij">
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Skopiowano!" : "Kopiuj jako Markdown"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Pobierz .md
        </DropdownMenuItem>

        {conversationId && (
          <>
            <DropdownMenuSeparator />
            {sharedToken ? (
              <>
                <DropdownMenuItem onClick={handleCopyShareLink}>
                  <Link className="h-4 w-4 mr-2" />
                  Kopiuj link udostępniania
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUnshare}>
                  <Link2Off className="h-4 w-4 mr-2" />
                  Wyłącz udostępnianie
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij przez link
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
