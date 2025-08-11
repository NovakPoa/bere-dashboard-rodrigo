import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Archive, Pin, PinOff, Search, Trash2, Edit, Plus } from "lucide-react";

const STORAGE_KEY = "smart_lists_notes_v1";

type NoteColor = "default" | "primary" | "secondary" | "accent" | "muted";

type Note = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

const emptyDraft: Omit<Note, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  content: "",
  color: "default",
  pinned: false,
  archived: false,
  tags: [],
};

function noteCardClasses(color: NoteColor) {
  switch (color) {
    case "primary":
      return "border-primary/30 bg-primary/10";
    case "secondary":
      return "border-secondary/30 bg-secondary";
    case "accent":
      return "border-accent/30 bg-accent";
    case "muted":
      return "border-muted/50 bg-muted";
    default:
      return ""; // usa bg-card padrão
  }
}

export default function Listas() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Note[]) : [];
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState(emptyDraft);
  const [draftTags, setDraftTags] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [editTags, setEditTags] = useState("");

  useEffect(() => setPageSEO("Listas inteligentes", "Notas estilo Google Keep com listas e lembretes"), []);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)), [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byQuery = (n: Note) =>
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q));
    const active = notes.filter((n) => !n.archived && byQuery(n));
    const archived = notes.filter((n) => n.archived && byQuery(n));
    return {
      pinned: active.filter((n) => n.pinned),
      others: active.filter((n) => !n.pinned),
      archived,
    };
  }, [notes, query]);

  function parseTags(input: string) {
    return input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function addNote() {
    if (!draft.title && !draft.content) {
      toast.warning("Escreva um título ou conteúdo");
      return;
    }
    const newNote: Note = {
      id: String(Date.now()),
      title: draft.title.trim(),
      content: draft.content.trim(),
      color: draft.color,
      pinned: draft.pinned,
      archived: false,
      tags: parseTags(draftTags),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setDraft(emptyDraft);
    setDraftTags("");
    toast.success("Nota adicionada");
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast("Nota removida");
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n))
    );
  }

  function toggleArchive(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: !n.archived, pinned: n.archived ? n.pinned : false, updatedAt: Date.now() } : n))
    );
  }

  function openEdit(note: Note) {
    setEditing(note);
    setEditTags(note.tags.join(", "));
  }

  function saveEdit() {
    if (!editing) return;
    const updated: Note = { ...editing, tags: parseTags(editTags), updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditing(null);
    toast.success("Nota atualizada");
  }

  return (
    <div className="min-h-screen">
      <header className="container py-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Listas inteligentes</h1>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="criar">
          <h2 id="criar" className="sr-only">Criar nota</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Nova nota</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid md:grid-cols-4 gap-3">
                <Input
                  placeholder="Título"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="md:col-span-2"
                />
                <Input
                  placeholder="Tags (separe por vírgula)"
                  value={draftTags}
                  onChange={(e) => setDraftTags(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Cor:</span>
                  {(["default", "primary", "secondary", "accent", "muted"] as NoteColor[]).map((c) => (
                    <button
                      key={c}
                      aria-label={`Cor ${c}`}
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={cn(
                        "h-6 w-6 rounded-full border",
                        c === "primary" && "bg-primary/20 border-primary/40",
                        c === "secondary" && "bg-secondary border-secondary/50",
                        c === "accent" && "bg-accent border-accent/50",
                        c === "muted" && "bg-muted border-muted/50",
                        c === "default" && "bg-card",
                        draft.color === c && "ring-2 ring-ring"
                      )}
                    />
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Anote aqui..."
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              />
              <div className="flex justify-end">
                <Button onClick={addNote}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="buscar">
          <h2 id="buscar" className="sr-only">Buscar notas</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por texto ou tag"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar notas"
              />
            </div>
            <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived((v) => !v)}>
              <Archive className="h-4 w-4 mr-2" /> {showArchived ? "Ocultar arquivadas" : "Ver arquivadas"}
            </Button>
          </div>
        </section>

        {filtered.pinned.length > 0 && (
          <section aria-labelledby="fixadas" className="space-y-4">
            <h2 id="fixadas" className="text-sm text-muted-foreground">Fixadas</h2>
            <NotesGrid
              notes={filtered.pinned}
              onEdit={openEdit}
              onRemove={removeNote}
              onTogglePin={togglePin}
              onToggleArchive={toggleArchive}
            />
          </section>
        )}

        <section aria-labelledby="outras" className="space-y-4">
          <h2 id="outras" className="text-sm text-muted-foreground">Outras</h2>
          <NotesGrid
            notes={filtered.others}
            onEdit={openEdit}
            onRemove={removeNote}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
          />
        </section>

        {showArchived && (
          <section aria-labelledby="arquivadas" className="space-y-4">
            <h2 id="arquivadas" className="text-sm text-muted-foreground">Arquivadas</h2>
            <NotesGrid
              notes={filtered.archived}
              onEdit={openEdit}
              onRemove={removeNote}
              onTogglePin={togglePin}
              onToggleArchive={toggleArchive}
            />
          </section>
        )}
      </main>

      <EditDialog
        note={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={saveEdit}
        setNote={(updater) =>
          setEditing((prev) => (prev ? (typeof updater === "function" ? updater(prev) : updater) : prev))
        }
        editTags={editTags}
        setEditTags={setEditTags}
      />
    </div>
  );
}

function NotesGrid({
  notes,
  onEdit,
  onRemove,
  onTogglePin,
  onToggleArchive,
}: {
  notes: Note[];
  onEdit: (n: Note) => void;
  onRemove: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
}) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma nota aqui.</p>;
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {notes.map((n) => (
        <Card key={n.id} className={cn("border", noteCardClasses(n.color))}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                {n.title && <CardTitle className="text-base leading-tight">{n.title}</CardTitle>}
                {n.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {n.tags.map((t, i) => (
                      <Badge key={i} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onTogglePin(n.id)} aria-label={n.pinned ? "Desafixar" : "Fixar"}>
                      {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{n.pinned ? "Desafixar" : "Fixar"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onToggleArchive(n.id)} aria-label={n.archived ? "Desarquivar" : "Arquivar"}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{n.archived ? "Desarquivar" : "Arquivar"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(n)} aria-label="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(n.id)} aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{n.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EditDialog({
  note,
  onOpenChange,
  onSave,
  setNote,
  editTags,
  setEditTags,
}: {
  note: Note | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  setNote: React.Dispatch<React.SetStateAction<Note | null>>;
  editTags: string;
  setEditTags: (v: string) => void;
}) {
  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar nota</DialogTitle>
        </DialogHeader>
        {note && (
          <div className="grid gap-3">
            <Input
              placeholder="Título"
              value={note.title}
              onChange={(e) => setNote((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
            />
            <Textarea
              placeholder="Conteúdo"
              value={note.content}
              onChange={(e) => setNote((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
            />
            <Input
              placeholder="Tags (separe por vírgula)"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cor:</span>
              {(["default", "primary", "secondary", "accent", "muted"] as NoteColor[]).map((c) => (
                <button
                  key={c}
                  aria-label={`Cor ${c}`}
                  onClick={() => setNote((prev) => (prev ? { ...prev, color: c } : prev))}
                  className={cn(
                    "h-6 w-6 rounded-full border",
                    c === "primary" && "bg-primary/20 border-primary/40",
                    c === "secondary" && "bg-secondary border-secondary/50",
                    c === "accent" && "bg-accent border-accent/50",
                    c === "muted" && "bg-muted border-muted/50",
                    c === "default" && "bg-card",
                    note?.color === c && "ring-2 ring-ring"
                  )}
                />
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

