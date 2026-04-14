import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Bot, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RunCodeButton } from "@/components/CodeExecutionResult";

// Languages supported for code execution in the sandbox
const RUNNABLE_LANGUAGES = new Set([
  "javascript", "js", "typescript", "ts",
]);

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
                return <CodeBlock language={match[1]} code={code} />;
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

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const isRunnable = RUNNABLE_LANGUAGES.has(language.toLowerCase());

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-muted/80 px-3 py-1.5 text-xs text-muted-foreground rounded-t-md">
        <span>{language}</span>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="flex items-center gap-1 hover:text-foreground">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: isRunnable ? 0 : undefined, borderBottomRightRadius: isRunnable ? 0 : undefined }}
      >
        {code}
      </SyntaxHighlighter>
      {isRunnable && (
        <div className="border border-t-0 rounded-b-md px-2 py-1 bg-muted/30">
          <RunCodeButton language={language} code={code} />
        </div>
      )}
    </div>
  );
}
