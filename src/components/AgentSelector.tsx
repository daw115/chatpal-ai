import { AGENTS, type Agent } from "@/lib/agents";
import { cn } from "@/lib/utils";

interface AgentSelectorProps {
  onSelect: (agent: Agent) => void;
}

export function AgentSelector({ onSelect }: AgentSelectorProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Wybierz agenta</h2>
        <p className="mt-1 text-muted-foreground">
          Rozpocznij czat z wyspecjalizowanym asystentem
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => {
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
      </div>
    </div>
  );
}
