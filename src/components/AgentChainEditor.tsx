import { useState } from "react";
import { Link2, Plus, X, ArrowDown, Play, GripVertical } from "lucide-react";
import { AGENTS, type Agent } from "@/lib/agents";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomAgents, getIconComponent, type CustomAgent } from "@/components/CustomAgentEditor";

export interface AgentChainStep {
  agentId: string;
  label: string;
}

export interface AgentChain {
  name: string;
  steps: AgentChainStep[];
}

function getAllAgents(customAgents: CustomAgent[]): { id: string; name: string; icon: any }[] {
  const builtIn = AGENTS.map(a => ({ id: a.id, name: a.name, icon: a.icon }));
  const custom = customAgents.map(ca => ({
    id: `custom:${ca.id}`,
    name: ca.name,
    icon: getIconComponent(ca.icon),
  }));
  return [...builtIn, ...custom];
}

interface AgentChainEditorProps {
  onRun: (chain: AgentChain) => void;
}

export function AgentChainEditor({ onRun }: AgentChainEditorProps) {
  const { customAgents } = useCustomAgents();
  const allAgents = getAllAgents(customAgents);

  const [open, setOpen] = useState(false);
  const [chainName, setChainName] = useState("Mój łańcuch");
  const [steps, setSteps] = useState<AgentChainStep[]>([
    { agentId: "translator", label: "Tłumacz" },
    { agentId: "writer", label: "Pisarz" },
  ]);

  // Saved chains in localStorage
  const [savedChains, setSavedChains] = useState<AgentChain[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("agent_chains") || "[]");
    } catch { return []; }
  });

  const addStep = () => {
    const first = allAgents[0];
    setSteps(prev => [...prev, { agentId: first.id, label: first.name }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, agentId: string) => {
    const agent = allAgents.find(a => a.id === agentId);
    setSteps(prev => prev.map((s, i) => i === index ? { agentId, label: agent?.name || agentId } : s));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const newSteps = [...steps];
    const [moved] = newSteps.splice(from, 1);
    newSteps.splice(to, 0, moved);
    setSteps(newSteps);
  };

  const saveChain = () => {
    const chain: AgentChain = { name: chainName, steps };
    const existing = savedChains.filter(c => c.name !== chainName);
    const updated = [...existing, chain];
    setSavedChains(updated);
    localStorage.setItem("agent_chains", JSON.stringify(updated));
  };

  const deleteChain = (name: string) => {
    const updated = savedChains.filter(c => c.name !== name);
    setSavedChains(updated);
    localStorage.setItem("agent_chains", JSON.stringify(updated));
  };

  const loadChain = (chain: AgentChain) => {
    setChainName(chain.name);
    setSteps(chain.steps);
  };

  const handleRun = () => {
    if (steps.length < 2) return;
    onRun({ name: chainName, steps });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Łańcuchy agentów">
          <Link2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Łańcuch agentów</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Wynik każdego agenta trafia jako wejście do następnego.
        </p>

        {/* Saved chains */}
        {savedChains.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Zapisane łańcuchy:</span>
            <div className="flex flex-wrap gap-1">
              {savedChains.map((c) => (
                <div key={c.name} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                  <button onClick={() => loadChain(c)} className="hover:underline">{c.name} ({c.steps.length})</button>
                  <button onClick={() => deleteChain(c.name)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Input
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
            placeholder="Nazwa łańcucha"
            className="text-sm"
          />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStep(i, i - 1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                  >
                    <GripVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveStep(i, i + 1)}
                    disabled={i === steps.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                <Select value={step.agentId} onValueChange={(v) => updateStep(i, v)}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAgents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addStep} className="w-full">
          <Plus className="h-3 w-3 mr-1" /> Dodaj krok
        </Button>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={saveChain} disabled={!chainName.trim() || steps.length < 2}>
            Zapisz
          </Button>
          <Button size="sm" onClick={handleRun} disabled={steps.length < 2} className="flex-1">
            <Play className="h-3 w-3 mr-1" /> Uruchom łańcuch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
