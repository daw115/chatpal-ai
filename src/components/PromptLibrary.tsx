import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Trash2, Pencil, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface PromptLibraryProps {
  onInsert: (content: string) => void;
}

export function PromptLibrary({ onInsert }: PromptLibraryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "Ogólne" });

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_prompts")
      .select("id, title, content, category")
      .order("updated_at", { ascending: false });
    if (data) setPrompts(data);
  }, [user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const filtered = search.trim()
    ? prompts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )
    : prompts;

  const categories = [...new Set(prompts.map(p => p.category))];

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) return;

    if (editingId) {
      await supabase.from("saved_prompts").update({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim() || "Ogólne",
      }).eq("id", editingId);
    } else {
      await supabase.from("saved_prompts").insert({
        user_id: user.id,
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim() || "Ogólne",
      });
    }

    setCreating(false);
    setEditingId(null);
    setForm({ title: "", content: "", category: "Ogólne" });
    load();
    toast({ title: editingId ? "Prompt zaktualizowany" : "Prompt zapisany" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("saved_prompts").delete().eq("id", id);
    load();
  };

  const handleEdit = (p: SavedPrompt) => {
    setForm({ title: p.title, content: p.content, category: p.category });
    setEditingId(p.id);
    setCreating(true);
  };

  const handleInsert = (content: string) => {
    onInsert(content);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" title="Biblioteka promptów">
          <BookOpen className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteka promptów</DialogTitle>
        </DialogHeader>

        {creating ? (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tytuł</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Np. Analiza kodu" />
            </div>
            <div className="space-y-1">
              <Label>Kategoria</Label>
              <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ogólne" />
            </div>
            <div className="space-y-1">
              <Label>Treść promptu</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Przeanalizuj poniższy kod pod kątem..."
                className="min-h-[120px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!form.title.trim() || !form.content.trim()} className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1" /> {editingId ? "Zapisz zmiany" : "Zapisz"}
              </Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setEditingId(null); setForm({ title: "", content: "", category: "Ogólne" }); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj promptów..." className="pl-8 h-9" />
              </div>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nowy
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-2" />
                  <p className="text-sm">{prompts.length === 0 ? "Brak zapisanych promptów" : "Brak wyników"}</p>
                  {prompts.length === 0 && (
                    <Button variant="link" size="sm" onClick={() => setCreating(true)}>
                      Dodaj pierwszy prompt
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {filtered.map(p => (
                    <div
                      key={p.id}
                      className="group rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleInsert(p.content)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{p.title}</p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{p.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.content}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-1 rounded hover:bg-accent">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-1 rounded hover:bg-accent">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
