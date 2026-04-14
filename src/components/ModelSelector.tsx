import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODELS } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

const PROVIDER_ORDER = ["Anthropic", "Google", "OpenAI"];

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const grouped = PROVIDER_ORDER.map(provider => ({
    provider,
    models: MODELS.filter(m => m.provider === provider),
  })).filter(g => g.models.length > 0);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {grouped.map((group) => (
          <SelectGroup key={group.provider}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {group.provider === "Anthropic" ? "Claude" : group.provider === "Google" ? "Gemini" : "GPT"}
            </SelectLabel>
            {group.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
