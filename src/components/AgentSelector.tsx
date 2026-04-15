import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { AGENTS, type Agent } from "@/lib/agents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomAgentEditor, useCustomAgents, getIconComponent, type CustomAgent } from "@/components/CustomAgentEditor";
import { supabase } from "@/integrations/supabase/client";

interface AgentSelectorProps {
  onSelect: (agent: Agent) => void;
}

/** Convert a CustomAgent (DB) into the Agent shape used by the app */
function toAgent(ca: CustomAgent): Agent {
  return {
    id: `custom:${ca.id}`,
    name: ca.name,
    description: "",
    icon: getIconComponent(ca.icon),
    systemPrompt: ca.system_prompt,
    color: "", // we use inline style instead
    _customColor: ca.color,
    _defaultModel: ca.default_model,
  } as Agent & { _customColor: string; _defaultModel: string };
}

export function AgentSelector({ onSelect }: AgentSelectorProps) {
  const { customAgents, reloadCustomAgents } = useCustomAgents();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);
  const [search, setSearch] = useState("");

  const filteredAgents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return AGENTS;
    return AGENTS.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [search]);

  const filteredCustom = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customAgents;
    return customAgents.filter(a => a.name.toLowerCase().includes(q));
  }, [search, customAgents]);

  const handleDeleteCustom = async (id: string) => {
    await supabase.from("custom_agents").delete().eq("id", id);
    reloadCustomAgents();
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Wybierz agenta</h2>
        <p className="mt-1 text-muted-foreground">
          Rozpocznij czat z wyspecjalizowanym asystentem
        </p>
      </div>
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj agenta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                "hover:border-primary/50 hover:shadow-md hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white", agent.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </div>
            </button>
          );
        })}

        {/* Custom agents */}
        {customAgents.map((ca) => {
          const Icon = getIconComponent(ca.icon);
          const agent = toAgent(ca);
          return (
            <div
              key={ca.id}
              className={cn(
                "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer",
                "hover:border-primary/50 hover:shadow-md hover:bg-accent/50"
              )}
              onClick={() => onSelect(agent)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: ca.color }}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{ca.name}</p>
                <p className="text-xs text-muted-foreground">Agent użytkownika</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingAgent(ca); setEditorOpen(true); }}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCustom(ca.id); }}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add custom agent button */}
        <button
          onClick={() => { setEditingAgent(null); setEditorOpen(true); }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 transition-all",
            "hover:border-primary/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="h-8 w-8" />
          <p className="text-sm font-medium">Stwórz agenta</p>
        </button>
      </div>

      <CustomAgentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editAgent={editingAgent}
        onSaved={reloadCustomAgents}
      />
    </div>
  );
}
