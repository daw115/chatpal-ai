import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Paperclip, X, FileText, Image, File } from "lucide-react";
import { PromptLibrary } from "@/components/PromptLibrary";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  onSend: (message: string, files?: UploadedFile[]) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("text/") || type.includes("pdf") || type.includes("json") || type.includes("xml")) return FileText;
  return File;
}

export function ChatInput({ onSend, onStop, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && files.length === 0) || isLoading) return;
    onSend(trimmed || "Przeanalizuj przesłane pliki.", files.length > 0 ? files : undefined);
    setInput("");
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selected.length && files.length + newFiles.length < MAX_FILES; i++) {
      const file = selected[i];
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;

      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      newFiles.push({ file, preview });
    }

    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const f = prev[index];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files;
    if (!dropped) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < dropped.length && files.length + newFiles.length < MAX_FILES; i++) {
      const file = dropped[i];
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      newFiles.push({ file, preview });
    }
    setFiles(prev => [...prev, ...newFiles]);
  };

  return (
    <div className="border-t bg-background p-4">
      <div
        className="mx-auto max-w-3xl"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f, i) => {
              const Icon = getFileIcon(f.file.type);
              return (
                <div
                  key={i}
                  className="group relative flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs max-w-[200px]"
                >
                  {f.preview ? (
                    <img src={f.preview} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate text-foreground">{f.file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.css,.js,.ts,.jsx,.tsx,.py,.rb,.go,.java,.c,.cpp,.rs,.sql,.sh,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.log,.toml,.ini,.cfg,.conf"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || files.length >= MAX_FILES}
            title="Załącz plik"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? "Opisz co chcesz zrobić z plikami..." : "Napisz wiadomość..."}
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
            disabled={disabled}
          />
          {isLoading ? (
            <Button onClick={onStop} variant="destructive" size="icon" className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              size="icon"
              className="shrink-0"
              disabled={(!input.trim() && files.length === 0) || disabled}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-10">
          Maks. {MAX_FILES} plików, do {MAX_SIZE_MB}MB każdy. Obsługiwane: tekst, kod, CSV, JSON, PDF, obrazy.
        </p>
      </div>
    </div>
  );
}
