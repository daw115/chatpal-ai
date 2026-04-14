import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Pencil, RotateCcw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonacoCodeBlock } from "@/components/MonacoCodeBlock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLast?: boolean;
  isStreaming?: boolean;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({ role, content, isLast, isStreaming, onEdit, onRegenerate }: ChatMessageProps) {
  const isUser = role === "user";
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleSaveEdit = () => {
    if (editValue.trim() && onEdit) {
      onEdit(editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div className={cn("group flex gap-3 px-4 py-6", isUser ? "bg-background" : "bg-muted/30")}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary" : "bg-secondary"
      )}>
        {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4 text-secondary-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}><Check className="h-3 w-3 mr-1" /> Zapisz</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditValue(content); }}><X className="h-3 w-3 mr-1" /> Anuluj</Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const code = String(children).replace(/\n$/, "");
                  if (match) {
                    return <MonacoCodeBlock language={match[1]} code={code} />;
                  }
                  return <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {/* Action buttons */}
        {!editing && !isStreaming && (
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUser && onEdit && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setEditValue(content); setEditing(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> Edytuj
              </Button>
            )}
            {!isUser && isLast && onRegenerate && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onRegenerate}>
                <RotateCcw className="h-3 w-3 mr-1" /> Regeneruj
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
