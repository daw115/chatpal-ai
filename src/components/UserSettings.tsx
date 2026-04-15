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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MODELS } from "@/lib/models";
import { AGENTS } from "@/lib/agents";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "user-settings";

export type InterfaceLanguage = "pl" | "en";

export interface UserSettingsData {
  defaultModel: string;
  defaultAgentId: string;
  fontSize: number;
  language: InterfaceLanguage;
  autoTitle: boolean;
  customInstructions: string;
}

const DEFAULTS: UserSettingsData = {
  defaultModel: "gemini-3-flash",
  defaultAgentId: "",
  fontSize: 15,
  language: "pl",
  autoTitle: true,
  customInstructions: "",
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

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
}

const PROVIDER_ORDER = ["Anthropic", "Google", "OpenAI"];

const labels = {
  pl: {
    title: "Ustawienia",
    defaultModel: "Domyślny model",
    defaultAgent: "Domyślny agent",
    fontSize: "Rozmiar czcionki",
    language: "Język interfejsu",
    autoTitle: "Automatyczne tytułowanie konwersacji",
    autoTitleDesc: "AI generuje tytuł na podstawie pierwszej wiadomości",
    save: "Zapisz ustawienia",
    saved: "Zapisano",
    savedDesc: "Ustawienia zostały zapisane.",
    appearance: "Wygląd",
    behavior: "Zachowanie",
    defaults: "Domyślne wartości",
    customInstructions: "Instrukcje użytkownika",
    customInstructionsDesc: "Globalne instrukcje dodawane do każdej rozmowy (np. \"Odpowiadaj po polsku\", \"Jestem programistą Python\")",
    customInstructionsPlaceholder: "Np. Zawsze odpowiadaj zwięźle. Jestem senior developerem...",
  },
  en: {
    title: "Settings",
    defaultModel: "Default model",
    defaultAgent: "Default agent",
    fontSize: "Font size",
    language: "Interface language",
    autoTitle: "Auto-title conversations",
    autoTitleDesc: "AI generates title based on first message",
    save: "Save settings",
    saved: "Saved",
    savedDesc: "Settings have been saved.",
    appearance: "Appearance",
    behavior: "Behavior",
    defaults: "Defaults",
    customInstructions: "Custom instructions",
    customInstructionsDesc: "Global instructions added to every conversation (e.g. \"Reply in English\", \"I'm a Python developer\")",
    customInstructionsPlaceholder: "E.g. Always be concise. I'm a senior developer...",
  },
};

export function t(key: keyof typeof labels.pl, lang?: InterfaceLanguage): string {
  const l = lang || loadUserSettings().language;
  return labels[l]?.[key] ?? labels.pl[key];
}

export function UserSettings({ onSettingsChange }: { onSettingsChange?: (s: UserSettingsData) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettingsData>(loadUserSettings);

  useEffect(() => {
    setSettings(loadUserSettings());
  }, [open]);

  const handleSave = () => {
    saveUserSettings(settings);
    applyFontSize(settings.fontSize);
    onSettingsChange?.(settings);
    setOpen(false);
    toast({ title: t("saved", settings.language), description: t("savedDesc", settings.language) });
  };

  const l = settings.language;

  const grouped = PROVIDER_ORDER.map(provider => ({
    provider,
    models: MODELS.filter(m => m.provider === provider),
  })).filter(g => g.models.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("title", l)}>
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title", l)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("defaults", l)}</p>

          <div className="space-y-2">
            <Label>{t("defaultModel", l)}</Label>
            <Select value={settings.defaultModel} onValueChange={(v) => setSettings(s => ({ ...s, defaultModel: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Label>{t("defaultAgent", l)}</Label>
            <Select value={settings.defaultAgentId} onValueChange={(v) => setSettings(s => ({ ...s, defaultAgentId: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGENTS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("behavior", l)}</p>

          <div className="space-y-2">
            <Label>{t("customInstructions", l)}</Label>
            <p className="text-xs text-muted-foreground">{t("customInstructionsDesc", l)}</p>
            <Textarea
              value={settings.customInstructions}
              onChange={(e) => setSettings(s => ({ ...s, customInstructions: e.target.value }))}
              placeholder={t("customInstructionsPlaceholder", l)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>{t("autoTitle", l)}</Label>
              <p className="text-xs text-muted-foreground">{t("autoTitleDesc", l)}</p>
            </div>
            <Switch
              checked={settings.autoTitle}
              onCheckedChange={(v) => setSettings(s => ({ ...s, autoTitle: v }))}
            />
          </div>

          <Separator />

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("appearance", l)}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("fontSize", l)}</Label>
              <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <Slider
              min={12} max={20} step={1}
              value={[settings.fontSize]}
              onValueChange={([v]) => setSettings(s => ({ ...s, fontSize: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("language", l)}</Label>
            <Select value={settings.language} onValueChange={(v) => setSettings(s => ({ ...s, language: v as InterfaceLanguage }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pl">🇵🇱 Polski</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full">{t("save", l)}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
