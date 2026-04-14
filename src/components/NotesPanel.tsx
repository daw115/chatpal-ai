import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { StickyNote, Plus, Trash2, CalendarIcon, CheckCircle2, Circle, Clock, FileText, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Note {
  id: string;
  title: string;
  content: string;
  due_date: string | null;
  is_done: boolean;
  type: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof StickyNote; color: string }> = {
  note: { label: "Notatka", icon: FileText, color: "bg-blue-500/10 text-blue-500" },
  todo: { label: "TODO", icon: ListTodo, color: "bg-amber-500/10 text-amber-500" },
  reminder: { label: "Przypomnienie", icon: Clock, color: "bg-purple-500/10 text-purple-500" },
};

export function NotesPanel() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("note");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();

  const loadNotes = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("user_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data } = await query;
    if (data) setNotes(data as Note[]);
  }, [user, filter]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) return;
    await supabase.from("user_notes").insert({
      user_id: user.id,
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      due_date: newDueDate?.toISOString() || null,
    });
    setNewTitle("");
    setNewContent("");
    setNewType("note");
    setNewDueDate(undefined);
    setAdding(false);
    loadNotes();
  };

  const toggleDone = async (note: Note) => {
    await supabase.from("user_notes").update({ is_done: !note.is_done }).eq("id", note.id);
    loadNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("user_notes").delete().eq("id", id);
    loadNotes();
  };

  const overdueCount = notes.filter(n => !n.is_done && n.due_date && new Date(n.due_date) < new Date()).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notatki i TODO">
          <StickyNote className="h-5 w-5" />
          {overdueCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {overdueCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" /> Notatki i TODO
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="note">Notatki</SelectItem>
              <SelectItem value="todo">TODO</SelectItem>
              <SelectItem value="reminder">Przypomnienia</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAdding(!adding)} className="ml-auto">
            <Plus className="h-4 w-4 mr-1" /> Dodaj
          </Button>
        </div>

        {adding && (
          <div className="mt-3 space-y-2 rounded-lg border p-3 bg-muted/30">
            <Input placeholder="Tytuł" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Textarea placeholder="Treść (opcjonalnie)" value={newContent} onChange={e => setNewContent(e.target.value)} className="min-h-[60px]" />
            <div className="flex gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Notatka</SelectItem>
                  <SelectItem value="todo">TODO</SelectItem>
                  <SelectItem value="reminder">Przypomnienie</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left", !newDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {newDueDate ? format(newDueDate, "d MMM yyyy", { locale: pl }) : "Termin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={newDueDate} onSelect={setNewDueDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>Zapisz</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Anuluj</Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {notes.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Brak notatek. Dodaj pierwszą lub poproś agenta!</p>
          )}
          {notes.map(note => {
            const cfg = TYPE_CONFIG[note.type] || TYPE_CONFIG.note;
            const Icon = cfg.icon;
            const isOverdue = !note.is_done && note.due_date && new Date(note.due_date) < new Date();

            return (
              <div key={note.id} className={cn("rounded-lg border p-3 group transition-colors", note.is_done && "opacity-60")}>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleDone(note)} className="mt-0.5 shrink-0">
                    {note.is_done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", note.is_done && "line-through")}>{note.title}</span>
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", cfg.color)}>
                        <Icon className="h-3 w-3 mr-0.5" /> {cfg.label}
                      </Badge>
                    </div>
                    {note.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>}
                    {note.due_date && (
                      <p className={cn("text-xs mt-1 flex items-center gap-1", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(note.due_date), "d MMM yyyy", { locale: pl })}
                        {isOverdue && " — zaległy!"}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => deleteNote(note.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Parses assistant response for note/todo/reminder markers and saves them */
export async function extractAndSaveNotes(content: string, userId: string) {
  // Match [SAVE_NOTE: title], [SAVE_TODO: title | content], [SAVE_REMINDER: title | termin: 2025-01-01]
  const regex = /\[SAVE_(NOTE|TODO|REMINDER):\s*([^\]]+)\]/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const typeMap: Record<string, string> = { NOTE: "note", TODO: "todo", REMINDER: "reminder" };
    const type = typeMap[match[1].toUpperCase()] || "note";
    const raw = match[2].trim();

    // Split by | to extract parts
    const parts = raw.split("|").map(s => s.trim());
    const title = parts[0];
    let noteContent = "";
    let dueDate: string | null = null;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const terminMatch = part.match(/^termin:\s*(.+)/i);
      if (terminMatch) {
        try {
          const parsed = new Date(terminMatch[1].trim());
          if (!isNaN(parsed.getTime())) dueDate = parsed.toISOString();
        } catch { /* skip */ }
      } else {
        noteContent += (noteContent ? " | " : "") + part;
      }
    }

    await supabase.from("user_notes").insert({
      user_id: userId,
      title,
      content: noteContent,
      type,
      due_date: dueDate,
    });
  }
}
