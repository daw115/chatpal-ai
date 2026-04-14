import { useState } from "react";
import { Plus, Trash2, MessageSquare, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  model: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete }: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-3 space-y-2">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" /> Nowy czat
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-sidebar-accent",
                activeId === c.id && "bg-sidebar-accent"
              )}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && search && (
            <p className="text-xs text-muted-foreground text-center py-4">Brak wyników</p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="truncate">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={signOut} title="Wyloguj">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
