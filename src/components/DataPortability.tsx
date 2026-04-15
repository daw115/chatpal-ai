import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loadUserSettings, type UserSettingsData } from "@/components/UserSettings";
import type { CustomAgent } from "@/components/CustomAgentEditor";
import { Separator } from "@/components/ui/separator";

interface ExportData {
  version: 1;
  exportedAt: string;
  settings: UserSettingsData;
  customAgents: Omit<CustomAgent, "id">[];
  savedPrompts: { title: string; content: string; category: string }[];
}

export function DataPortability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;

    const [agentsRes, promptsRes] = await Promise.all([
      supabase.from("custom_agents").select("name, icon, system_prompt, default_model, color"),
      supabase.from("saved_prompts").select("title, content, category"),
    ]);

    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: loadUserSettings(),
      customAgents: agentsRes.data ?? [],
      savedPrompts: promptsRes.data ?? [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Wyeksportowano", description: "Plik z danymi został pobrany." });
  };

  const handleImport = async (file: File) => {
    if (!user) return;
    setImporting(true);

    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      if (data.version !== 1) {
        toast({ title: "Błąd", description: "Nieobsługiwana wersja pliku.", variant: "destructive" });
        return;
      }

      // Import settings
      if (data.settings) {
        localStorage.setItem("user-settings", JSON.stringify(data.settings));
      }

      // Import custom agents (skip duplicates by name)
      if (data.customAgents?.length) {
        const { data: existing } = await supabase.from("custom_agents").select("name");
        const existingNames = new Set((existing ?? []).map(a => a.name));

        const newAgents = data.customAgents
          .filter(a => !existingNames.has(a.name))
          .map(a => ({ ...a, user_id: user.id }));

        if (newAgents.length > 0) {
          await supabase.from("custom_agents").insert(newAgents);
        }
      }

      // Import saved prompts (skip duplicates by title)
      if (data.savedPrompts?.length) {
        const { data: existing } = await supabase.from("saved_prompts").select("title");
        const existingTitles = new Set((existing ?? []).map(p => p.title));

        const newPrompts = data.savedPrompts
          .filter(p => !existingTitles.has(p.title))
          .map(p => ({ ...p, user_id: user.id }));

        if (newPrompts.length > 0) {
          await supabase.from("saved_prompts").insert(newPrompts);
        }
      }

      toast({
        title: "Zaimportowano",
        description: `Ustawienia, ${data.customAgents?.length ?? 0} agentów i ${data.savedPrompts?.length ?? 0} promptów.`,
      });
      setOpen(false);
    } catch {
      toast({ title: "Błąd importu", description: "Nieprawidłowy plik JSON.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Eksport / Import">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Eksport / Import danych</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Eksportuj ustawienia, custom agentów i zapisane prompty do pliku JSON.
            </p>
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" /> Eksportuj dane
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Importuj dane z pliku JSON. Istniejące duplikaty zostaną pominięte.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={importing}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImport(file);
                };
                input.click();
              }}
            >
              <Upload className="h-4 w-4" /> {importing ? "Importowanie..." : "Importuj dane"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
