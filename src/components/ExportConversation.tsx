import { Download, Copy, Check, Share2, Link, Link2Off, FileText } from "lucide-react";
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
import jsPDF from "jspdf";

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

// Simple syntax keyword highlighting colors
const KEYWORDS = new Set([
  "const","let","var","function","return","if","else","for","while","class",
  "import","export","from","default","async","await","try","catch","throw",
  "new","this","typeof","instanceof","in","of","switch","case","break",
  "continue","do","void","null","undefined","true","false","yield","super",
  "extends","implements","interface","type","enum","public","private",
  "protected","static","readonly","abstract","as","is","declare","module",
  "namespace","require","def","self","print","lambda","elif","pass","raise",
  "with","except","finally","None","True","False","int","str","float","list",
  "dict","tuple","set","bool",
]);

interface ColoredToken {
  text: string;
  color: [number, number, number];
}

function tokenizeCode(code: string): ColoredToken[] {
  const tokens: ColoredToken[] = [];
  const regex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|[a-zA-Z_$]\w*|[^\s])/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    const t = match[0];
    let color: [number, number, number];

    if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("#")) {
      color = [106, 153, 85]; // green comments
    } else if (t.startsWith('"') || t.startsWith("'") || t.startsWith("`")) {
      color = [206, 145, 120]; // orange strings
    } else if (/^\d/.test(t)) {
      color = [181, 206, 168]; // light green numbers
    } else if (KEYWORDS.has(t)) {
      color = [86, 156, 214]; // blue keywords
    } else {
      color = [212, 212, 212]; // light gray default
    }
    tokens.push({ text: t, color });
  }
  return tokens;
}

function exportToPdf(title: string, messages: Message[], agentName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y + 5);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const meta = `Data: ${new Date().toLocaleString("pl-PL")}${agentName ? ` | Agent: ${agentName}` : ""}`;
  doc.text(meta, margin, y);
  y += 8;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  for (const msg of messages) {
    const isUser = msg.role === "user";
    const label = isUser ? "Użytkownik" : "Asystent";
    const labelColor: [number, number, number] = isUser ? [59, 130, 246] : [16, 185, 129];

    ensureSpace(12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...labelColor);
    doc.text(label, margin, y);
    y += 5;

    // Parse content for code blocks
    const parts = msg.content.split(/(```[\s\S]*?```)/g);

    for (const part of parts) {
      if (part.startsWith("```") && part.endsWith("```")) {
        // Code block
        const codeContent = part.slice(3, -3);
        const firstNewline = codeContent.indexOf("\n");
        const code = firstNewline >= 0 ? codeContent.slice(firstNewline + 1) : codeContent;
        const codeLines = code.split("\n");

        const lineHeight = 3.5;
        const blockHeight = codeLines.length * lineHeight + 6;
        ensureSpace(Math.min(blockHeight, 60));

        // Dark background
        const bgStartY = y;
        doc.setFillColor(30, 30, 30);

        for (const codeLine of codeLines) {
          ensureSpace(lineHeight + 2);
          if (y === margin) {
            // New page started, draw bg fresh
          }
          // Draw line bg
          doc.setFillColor(30, 30, 30);
          doc.rect(margin, y - 1, contentW, lineHeight + 1, "F");

          doc.setFontSize(7.5);
          doc.setFont("courier", "normal");

          // Tokenize and color
          const tokens = tokenizeCode(codeLine);
          let x = margin + 3;
          for (const token of tokens) {
            doc.setTextColor(...token.color);
            const tokenText = token.text;
            doc.text(tokenText, x, y + 2);
            x += doc.getTextWidth(tokenText) + 0.8;
            if (x > pageW - margin - 3) break;
          }
          y += lineHeight;
        }
        y += 4;
      } else {
        // Regular text
        const textLines = part.split("\n");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);

        for (const textLine of textLines) {
          if (!textLine.trim()) {
            y += 2;
            continue;
          }

          // Bold markdown
          const cleanLine = textLine.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1");
          const wrapped = doc.splitTextToSize(cleanLine, contentW);
          for (const wl of wrapped) {
            ensureSpace(4.5);
            doc.text(wl, margin, y + 2);
            y += 4.5;
          }
        }
      }
    }

    // Separator between messages
    y += 3;
    ensureSpace(4);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  }

  const safeName = title.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/g, "").slice(0, 50);
  doc.save(`${safeName}.pdf`);
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

  const handlePdfExport = () => {
    try {
      exportToPdf(title, messages, agentName);
      toast({ title: "PDF wygenerowany!" });
    } catch {
      toast({ variant: "destructive", title: "Błąd", description: "Nie udało się wygenerować PDF" });
    }
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
        <DropdownMenuItem onClick={handlePdfExport}>
          <FileText className="h-4 w-4 mr-2" />
          Pobierz PDF
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
