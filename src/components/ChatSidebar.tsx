import { useState } from "react";
import { Plus, Trash2, MessageSquare, LogOut, Search, Pin, PinOff, FolderPlus, Folder, MoreHorizontal, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ConversationFolder {
  id: string;
  name: string;
  color: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  updated_at: string;
  pinned?: boolean;
  folder_id?: string | null;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMoveToFolder?: (convId: string, folderId: string | null) => void;
  folders?: ConversationFolder[];
  onCreateFolder?: (name: string, color: string) => void;
  onDeleteFolder?: (id: string) => void;
}

const FOLDER_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

function ConversationItem({
  c, activeId, onSelect, onDelete, onPin, onMoveToFolder, folders,
}: {
  c: Conversation;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMoveToFolder?: (convId: string, folderId: string | null) => void;
  folders?: ConversationFolder[];
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-sidebar-accent",
        activeId === c.id && "bg-sidebar-accent"
      )}
      onClick={() => onSelect(c.id)}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{c.title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onPin && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(c.id, !c.pinned); }}>
              {c.pinned ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
              {c.pinned ? "Odepnij" : "Przypnij"}
            </DropdownMenuItem>
          )}
          {onMoveToFolder && folders && folders.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {folders.map(f => (
                <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); onMoveToFolder(c.id, f.id); }}>
                  <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: f.color }} />
                  {f.name}
                </DropdownMenuItem>
              ))}
              {c.folder_id && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(c.id, null); }}>
                  <FolderOpen className="h-3.5 w-3.5 mr-2" /> Usuń z folderu
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ChatSidebar({
  conversations, activeId, onSelect, onNew, onDelete, onPin, onMoveToFolder, folders = [], onCreateFolder, onDeleteFolder,
}: ChatSidebarProps) {
  const { signOut, user } = useAuth();
  const [search, setSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const filtered = search.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const pinned = filtered.filter(c => c.pinned);
  const unpinned = filtered.filter(c => !c.pinned);

  // Group unpinned by folder
  const inFolders = folders.map(f => ({
    ...f,
    convs: unpinned.filter(c => c.folder_id === f.id),
  })).filter(f => f.convs.length > 0);
  const noFolder = unpinned.filter(c => !c.folder_id);

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName("");
      setNewFolderColor(FOLDER_COLORS[0]);
      setFolderDialogOpen(false);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-3 space-y-2">
        <div className="flex gap-1">
          <Button onClick={onNew} className="flex-1 justify-start gap-2" variant="outline">
            <Plus className="h-4 w-4" /> Nowy czat
          </Button>
          {onCreateFolder && (
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Nowy folder">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader><DialogTitle>Nowy folder</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Nazwa</Label>
                    <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Np. Praca" />
                  </div>
                  <div className="space-y-1">
                    <Label>Kolor</Label>
                    <div className="flex gap-2">
                      {FOLDER_COLORS.map(c => (
                        <button
                          key={c}
                          className={cn("h-6 w-6 rounded-full border-2", newFolderColor === c ? "border-foreground" : "border-transparent")}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewFolderColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateFolder} className="w-full">Utwórz</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj..." className="pl-8 h-8 text-sm" />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-1">
          {/* Pinned */}
          {pinned.length > 0 && (
            <>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Pin className="h-3 w-3" /> Przypięte
              </p>
              {pinned.map(c => (
                <ConversationItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onMoveToFolder={onMoveToFolder} folders={folders} />
              ))}
              <div className="my-1 border-b border-sidebar-border" />
            </>
          )}

          {/* Folders */}
          {inFolders.map(f => (
            <Collapsible key={f.id} defaultOpen>
              <div className="flex items-center gap-1 px-1">
                <CollapsibleTrigger className="flex-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  <Folder className="h-3 w-3" style={{ color: f.color }} />
                  {f.name}
                </CollapsibleTrigger>
                {onDeleteFolder && (
                  <button onClick={() => onDeleteFolder(f.id)} className="opacity-0 hover:opacity-100 group-hover:opacity-100">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
              <CollapsibleContent>
                {f.convs.map(c => (
                  <ConversationItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onMoveToFolder={onMoveToFolder} folders={folders} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Unfiled */}
          {noFolder.map(c => (
            <ConversationItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onMoveToFolder={onMoveToFolder} folders={folders} />
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
