import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonacoCodeBlock } from "@/components/MonacoCodeBlock";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-6", isUser ? "bg-background" : "bg-muted/30")}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary" : "bg-secondary"
      )}>
        {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4 text-secondary-foreground" />}
      </div>
      <div className="min-w-0 flex-1 prose prose-sm dark:prose-invert max-w-none">
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
    </div>
  );
}
