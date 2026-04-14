import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Bot, Code, Languages, BarChart3, PenTool, ImageIcon, Sparkles, BookOpen, Shield, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface CustomAgent {
  id: string;
  name: string;
  icon: string;
  system_prompt: string;
  default_model: string;
  color: string;
}

const ICON_OPTIONS = [
  { id: "Bot", icon: Bot },
  { id: "Code", icon: Code },
  { id: "Languages", icon: Languages },
  { id: "BarChart3", icon: BarChart3 },
  { id: "PenTool", icon: PenTool },
  { id: "ImageIcon", icon: ImageIcon },
  { id: "Sparkles", icon: Sparkles },
  { id: "BookOpen", icon: BookOpen },
  { id: "Shield", icon: Shield },
  { id: "Lightbulb", icon: Lightbulb },
];

const COLOR_OPTIONS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#64748b",
];

export function getIconComponent(iconId: string) {
  return ICON_OPTIONS.find(i => i.id === iconId)?.icon || Bot;
}

export function useCustomAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<CustomAgent[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("custom_agents")
      .select("id, name, icon, system_prompt, default_model, color")
      .order("created_at", { ascending: true });
    if (data) setAgents(data);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { customAgents: agents, reloadCustomAgents: load };
}

interface CustomAgentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAgent?: CustomAgent | null;
  onSaved: () => void;
}

export function CustomAgentEditor({ open, onOpenChange, editAgent, onSaved }: CustomAgentEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Bot");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultModel, setDefaultModel] = useState("gemini-3-flash");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name);
      setIcon(editAgent.icon);
      setColor(editAgent.color);
      setSystemPrompt(editAgent.system_prompt);
      setDefaultModel(editAgent.default_model);
    } else {
      setName("");
      setIcon("Bot");
      setColor(COLOR_OPTIONS[0]);
      setSystemPrompt("");
      setDefaultModel("gemini-3-flash");
    }
  }, [editAgent, open]);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      icon,
      color,
      system_prompt: systemPrompt,
      default_model: defaultModel,
      user_id: user.id,
    };

    if (editAgent) {
      await supabase.from("custom_agents").update(payload).eq("id", editAgent.id);
    } else {
      await supabase.from("custom_agents").insert(payload);
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
    toast({ title: editAgent ? "Agent zaktualizowany" : "Agent utworzony" });
  };

  const IconComp = getIconComponent(icon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAgent ? "Edytuj agenta" : "Nowy agent"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>
              <IconComp className="h-5 w-5" />
            </div>
            <span className="font-semibold">{name || "Nowy agent"}</span>
          </div>

          <div className="space-y-2">
            <Label>Nazwa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Np. Asystent SEO" />
          </div>

          <div className="space-y-2">
            <Label>Ikona</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(opt => {
                const I = opt.icon;
                return (
                  <button
                    key={opt.id}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                      icon === opt.id ? "border-primary bg-accent" : "border-transparent hover:bg-accent/50"
                    )}
                    onClick={() => setIcon(opt.id)}
                  >
                    <I className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kolor</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  className={cn("h-6 w-6 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Domyślny model</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Opisz rolę i zachowanie agenta..."
              className="min-h-[120px]"
            />
          </div>

          <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full">
            {saving ? "Zapisywanie..." : editAgent ? "Zapisz zmiany" : "Utwórz agenta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
