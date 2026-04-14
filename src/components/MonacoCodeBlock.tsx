import { useState, useCallback, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Copy, Check, Pencil, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { RunCodeButton } from "@/components/CodeExecutionResult";
import { useTheme } from "@/hooks/useTheme";

const RUNNABLE_LANGUAGES = new Set([
  "javascript", "js", "typescript", "ts",
]);

const LANG_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "shell",
  bash: "shell",
  yml: "yaml",
  md: "markdown",
  jsx: "javascript",
  tsx: "typescript",
};

function mapLanguage(lang: string): string {
  return LANG_MAP[lang.toLowerCase()] || lang.toLowerCase();
}

function lineCount(code: string): number {
  return code.split("\n").length;
}

interface MonacoCodeBlockProps {
  language: string;
  code: string;
}

export function MonacoCodeBlock({ language, code }: MonacoCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const { theme } = useTheme();
  const isRunnable = RUNNABLE_LANGUAGES.has(language.toLowerCase());
  const monacoLang = mapLanguage(language);

  const lines = lineCount(editing ? editedCode : code);
  const editorHeight = useMemo(() => {
    const h = Math.min(Math.max(lines * 20 + 16, 80), 500);
    return `${h}px`;
  }, [lines]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(editing ? editedCode : code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code, editedCode, editing]);

  const download = useCallback(() => {
    const ext = language.toLowerCase() === "typescript" || language.toLowerCase() === "ts" ? "ts"
      : language.toLowerCase() === "python" || language.toLowerCase() === "py" ? "py"
      : language.toLowerCase() === "javascript" || language.toLowerCase() === "js" ? "js"
      : language.toLowerCase();
    const blob = new Blob([editing ? editedCode : code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, editedCode, editing, language]);

  const handleMount: OnMount = (editor) => {
    // Disable minimap scrollbar for small blocks
    editor.updateOptions({
      scrollBeyondLastLine: false,
      renderLineHighlight: editing ? "all" : "none",
      contextmenu: false,
    });
  };

  return (
    <div className="relative group my-2 rounded-md overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/80 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium">{language}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setEditing(!editing); if (!editing) setEditedCode(code); }}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-foreground transition-colors",
              editing && "text-primary"
            )}
            title={editing ? "Podgląd" : "Edytuj"}
          >
            {editing ? <Eye className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {editing ? "Podgląd" : "Edytuj"}
          </button>
          <button onClick={download} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-foreground transition-colors" title="Pobierz">
            <Download className="h-3 w-3" />
          </button>
          <button onClick={copy} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-foreground transition-colors">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Skopiowano" : "Kopiuj"}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <Editor
        height={editorHeight}
        language={monacoLang}
        value={editing ? editedCode : code}
        onChange={(val) => editing && setEditedCode(val || "")}
        onMount={handleMount}
        theme={theme === "dark" ? "vs-dark" : "light"}
        options={{
          readOnly: !editing,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: lines > 5 ? "on" : "off",
          folding: lines > 10,
          wordWrap: "on",
          padding: { top: 8, bottom: 8 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: lines > 20 ? "auto" : "hidden",
            horizontal: "hidden",
            verticalScrollbarSize: 8,
          },
          renderLineHighlight: editing ? "all" : "none",
          domReadOnly: !editing,
          guides: { indentation: false },
        }}
      />

      {/* Run button for JS/TS */}
      {isRunnable && (
        <div className="border-t border-border px-2 py-1 bg-muted/30">
          <RunCodeButton language={language} code={editing ? editedCode : code} />
        </div>
      )}
    </div>
  );
}
