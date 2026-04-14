import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExportConversationProps {
  title: string;
  messages: Message[];
  agentName?: string;
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

export function ExportConversation({ title, messages, agentName }: ExportConversationProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Eksportuj">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
