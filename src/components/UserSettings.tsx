import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS } from "@/lib/models";
import { AGENTS } from "@/lib/agents";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "user-settings";

export interface UserSettingsData {
  defaultModel: string;
  defaultAgentId: string;
}

const DEFAULTS: UserSettingsData = {
  defaultModel: "gemini-3-flash",
  defaultAgentId: "general",
};

export function loadUserSettings(): UserSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function saveUserSettings(settings: UserSettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const PROVIDER_ORDER = ["Anthropic", "Google", "OpenAI"];

export function UserSettings({ onSettingsChange }: { onSettingsChange?: (s: UserSettingsData) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettingsData>(loadUserSettings);

  useEffect(() => {
    setSettings(loadUserSettings());
  }, [open]);

  const handleSave = () => {
    saveUserSettings(settings);
    onSettingsChange?.(settings);
    setOpen(false);
    toast({ title: "Zapisano", description: "Ustawienia zostały zapisane." });
  };

  const grouped = PROVIDER_ORDER.map(provider => ({
    provider,
    models: MODELS.filter(m => m.provider === provider),
  })).filter(g => g.models.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ustawienia">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ustawienia</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Domyślny model</Label>
            <Select value={settings.defaultModel} onValueChange={(v) => setSettings(s => ({ ...s, defaultModel: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grouped.map((group) => (
                  <SelectGroup key={group.provider}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground">
                      {group.provider === "Anthropic" ? "Claude" : group.provider === "Google" ? "Gemini" : "GPT"}
                    </SelectLabel>
                    {group.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Domyślny agent</Label>
            <Select value={settings.defaultAgentId} onValueChange={(v) => setSettings(s => ({ ...s, defaultAgentId: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENTS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span className="flex items-center gap-2">
                      {agent.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full">Zapisz ustawienia</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
