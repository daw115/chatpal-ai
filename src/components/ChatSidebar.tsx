import React, { useState } from "react";
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
  onRename?: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMoveToFolder?: (convId: string, folderId: string | null) => void;
  folders?: ConversationFolder[];
  onCreateFolder?: (name: string, color: string) => void;
  onDeleteFolder?: (id: string) => void;
}

const FOLDER_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

function ConversationItem({
  c, activeId, onSelect, onDelete, onRename, onPin, onMoveToFolder, folders,
}: {
  c: Conversation;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onMoveToFolder?: (convId: string, folderId: string | null) => void;
  folders?: ConversationFolder[];
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(c.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(c.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== c.title && onRename) {
      onRename(c.id, trimmed);
    }
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-sidebar-accent",
        activeId === c.id && "bg-sidebar-accent"
      )}
      onClick={() => !editing && onSelect(c.id)}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent border-b border-primary outline-none text-sm text-foreground min-w-0"
        />
      ) : (
        <span className="flex-1 truncate" onDoubleClick={startEditing}>{c.title}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onRename && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(); }}>
              <MessageSquare className="h-3.5 w-3.5 mr-2" /> Zmień nazwę
            </DropdownMenuItem>
          )}
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

function FolderDropZone({
  folder,
  children,
  onDrop,
  onDeleteFolder,
}: {
  folder: ConversationFolder;
  children: React.ReactNode;
  onDrop: (convId: string, folderId: string) => void;
  onDeleteFolder?: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <Collapsible defaultOpen>
      <div
        className={cn(
          "rounded-md transition-colors",
          dragOver && "bg-primary/10 ring-1 ring-primary/30"
        )}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const convId = e.dataTransfer.getData("text/plain");
          if (convId) onDrop(convId, folder.id);
        }}
      >
        <div className="flex items-center gap-1 px-1">
          <CollapsibleTrigger className="flex-1 flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <Folder className="h-3 w-3" style={{ color: folder.color }} />
            {folder.name}
          </CollapsibleTrigger>
          {onDeleteFolder && (
            <button onClick={() => onDeleteFolder(folder.id)} className="opacity-0 hover:opacity-100 group-hover:opacity-100">
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function UnfiledDropZone({
  children,
  onDrop,
}: {
  children: React.ReactNode;
  onDrop: (convId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "rounded-md transition-colors min-h-[8px]",
        dragOver && "bg-primary/10 ring-1 ring-primary/30"
      )}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const convId = e.dataTransfer.getData("text/plain");
        if (convId) onDrop(convId);
      }}
    >
      {children}
    </div>
  );
}

export function ChatSidebar({
  conversations, activeId, onSelect, onNew, onDelete, onRename, onPin, onMoveToFolder, folders = [], onCreateFolder, onDeleteFolder,
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

  const handleFolderDrop = (convId: string, folderId: string) => {
    onMoveToFolder?.(convId, folderId);
  };

  const handleUnfileDrop = (convId: string) => {
    onMoveToFolder?.(convId, null);
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

          {/* Folders with drop zones */}
          {inFolders.map(f => (
            <FolderDropZone key={f.id} folder={f} onDrop={handleFolderDrop} onDeleteFolder={onDeleteFolder}>
              {f.convs.map(c => (
                <ConversationItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onMoveToFolder={onMoveToFolder} folders={folders} />
              ))}
            </FolderDropZone>
          ))}

          {/* Also show empty folders as drop targets */}
          {folders.filter(f => !inFolders.find(inf => inf.id === f.id)).map(f => (
            <FolderDropZone key={f.id} folder={f} onDrop={handleFolderDrop} onDeleteFolder={onDeleteFolder}>
              <p className="text-[10px] text-muted-foreground px-3 py-1 italic">Przeciągnij tutaj</p>
            </FolderDropZone>
          ))}

          {/* Unfiled conversations - drop here to remove from folder */}
          <UnfiledDropZone onDrop={handleUnfileDrop}>
            {noFolder.map(c => (
              <ConversationItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onMoveToFolder={onMoveToFolder} folders={folders} />
            ))}
          </UnfiledDropZone>

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
