import { useState } from "react";
import { Play, RotateCcw, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeExecutionResultProps {
  stdout: string;
  stderr: string;
  exitCode: number;
  language: string;
  version: string;
  executionTime: number;
}

export function CodeExecutionResult({
  stdout,
  stderr,
  exitCode,
  language,
  version,
  executionTime,
}: CodeExecutionResultProps) {
  const isSuccess = exitCode === 0;
  const hasOutput = stdout || stderr;

  return (
    <div className="my-2 rounded-lg border overflow-hidden">
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 text-xs",
        isSuccess ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
      )}>
        <div className="flex items-center gap-2">
          {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          <span className="font-medium">{isSuccess ? "Wykonano pomyślnie" : `Błąd (kod: ${exitCode})`}</span>
          <span className="text-muted-foreground">• {language} {version}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{executionTime}ms</span>
        </div>
      </div>
      {hasOutput && (
        <pre className="px-3 py-2 text-sm bg-muted/30 overflow-x-auto max-h-[300px] overflow-y-auto font-mono">
          {stdout && <span>{stdout}</span>}
          {stderr && <span className="text-destructive">{stderr}</span>}
        </pre>
      )}
    </div>
  );
}

interface RunCodeButtonProps {
  language: string;
  code: string;
}

export function RunCodeButton({ language, code }: RunCodeButtonProps) {
  const [result, setResult] = useState<CodeExecutionResultProps | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCode = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/run-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ language, code }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "Błąd wykonania");
        return;
      }

      setResult(data);
    } catch {
      setError("Nie udało się połączyć z serwerem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={runCode}
          disabled={loading}
          className="h-7 text-xs gap-1"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : result ? (
            <RotateCcw className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {loading ? "Wykonywanie..." : result ? "Uruchom ponownie" : "Uruchom"}
        </Button>
      </div>
      {error && (
        <div className="my-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {result && <CodeExecutionResult {...result} />}
    </div>
  );
}
