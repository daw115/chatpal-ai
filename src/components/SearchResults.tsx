import { Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (!results.length) return null;

  return (
    <div className="my-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Globe className="h-3.5 w-3.5" />
        <span>Wyniki wyszukiwania dla: <strong className="text-foreground">{query}</strong></span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {results.slice(0, 6).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3 text-xs transition-colors",
              "hover:bg-accent/50 hover:border-primary/30"
            )}
          >
            <div className="flex items-start gap-2">
              <span className="font-medium text-foreground line-clamp-1 flex-1">{r.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
            </div>
            <span className="text-muted-foreground line-clamp-2">{r.snippet}</span>
            <span className="text-primary/70 truncate">{new URL(r.url).hostname}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
