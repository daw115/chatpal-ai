import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UsageRow {
  model: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
}

interface ModelStats {
  model: string;
  totalIn: number;
  totalOut: number;
  count: number;
}

export function UsageStats() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState("7d");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !open) return;

    const now = new Date();
    const from = new Date();
    if (period === "1d") from.setDate(now.getDate() - 1);
    else if (period === "7d") from.setDate(now.getDate() - 7);
    else if (period === "30d") from.setDate(now.getDate() - 30);
    else from.setFullYear(2020);

    supabase
      .from("usage_logs")
      .select("model, tokens_in, tokens_out, created_at")
      .eq("user_id", user.id)
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data);
      });
  }, [user, open, period]);

  const modelStats: ModelStats[] = Object.values(
    logs.reduce<Record<string, ModelStats>>((acc, log) => {
      if (!acc[log.model]) {
        acc[log.model] = { model: log.model, totalIn: 0, totalOut: 0, count: 0 };
      }
      acc[log.model].totalIn += log.tokens_in;
      acc[log.model].totalOut += log.tokens_out;
      acc[log.model].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));

  const totalIn = modelStats.reduce((s, m) => s + m.totalIn, 0);
  const totalOut = modelStats.reduce((s, m) => s + m.totalOut, 0);
  const totalCount = modelStats.reduce((s, m) => s + m.count, 0);
  const maxTokens = Math.max(...modelStats.map(m => m.totalIn + m.totalOut), 1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Statystyki użycia">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Statystyki użycia tokenów</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Okres:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24h</SelectItem>
              <SelectItem value="7d">7 dni</SelectItem>
              <SelectItem value="30d">30 dni</SelectItem>
              <SelectItem value="all">Wszystko</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-xs text-muted-foreground">Zapytań</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{formatTokens(totalIn)}</div>
            <div className="text-xs text-muted-foreground">Tokeny wejście</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{formatTokens(totalOut)}</div>
            <div className="text-xs text-muted-foreground">Tokeny wyjście</div>
          </div>
        </div>

        {/* Per-model bars */}
        {modelStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Brak danych dla wybranego okresu</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {modelStats.map((m) => {
              const total = m.totalIn + m.totalOut;
              const pct = (total / maxTokens) * 100;
              return (
                <div key={m.model}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{m.model}</span>
                    <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                      {m.count}x • {formatTokens(total)}
                    </span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="bg-primary/70 transition-all"
                        style={{ width: `${(m.totalIn / maxTokens) * 100}%` }}
                        title={`Wejście: ${m.totalIn.toLocaleString()}`}
                      />
                      <div
                        className="bg-primary transition-all"
                        style={{ width: `${(m.totalOut / maxTokens) * 100}%` }}
                        title={`Wyjście: ${m.totalOut.toLocaleString()}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/70" /> Wejście
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary" /> Wyjście
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
