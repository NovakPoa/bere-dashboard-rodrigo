import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Domain = "video" | "book";
type VideoSubtype = "filme" | "série";
type Status = "backlog" | "done";

type Item = {
  id: string;
  domain: Domain;
  subtype?: VideoSubtype; // vídeo: filme/série
  title: string;
  genre?: string;
  platformOrAuthor?: string; // vídeo: plataforma | livro: autor
  status: Status; // backlog | done (assistido/lido)
  date?: string; // YYYY-MM-DD
  rating?: number; // 1-5
};

const STORAGE_KEY = "culture_items_v1";

const loadItems = (): Item[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
};
const saveItems = (items: Item[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

export default function Cultura() {
  const [items, setItems] = useState<Item[]>(() => loadItems());
  useEffect(() => setPageSEO("Cultura", "Listas de filmes, séries e livros"), []);
  useEffect(() => saveItems(items), [items]);

  // Form inline por lista
  const [newForm, setNewForm] = useState<
    | null
    | {
        list: "video-backlog" | "video-done" | "book-backlog" | "book-done";
        title: string;
        subtype?: VideoSubtype;
        genre?: string;
        platformOrAuthor?: string;
        rating?: number;
        date?: string;
      }
  >(null);

  const toggleNew = (list: NonNullable<typeof newForm>["list"]) => {
    setNewForm((p) => (p?.list === list ? null : { list, title: "", subtype: "filme", rating: 0 }));
  };

  const addInline = (list: NonNullable<typeof newForm>["list"]) => {
    if (!newForm?.title.trim()) return;
    const domain: Domain = list.startsWith("video") ? "video" : "book";
    const status: Status = list.endsWith("done") ? "done" : "backlog";
    const it: Item = {
      id: crypto.randomUUID(),
      domain,
      status,
      title: newForm.title.trim(),
      subtype: domain === "video" ? newForm.subtype || "filme" : undefined,
      genre: newForm.genre?.trim() || undefined,
      platformOrAuthor: newForm.platformOrAuthor?.trim() || undefined,
      rating: newForm.rating || undefined,
      date: newForm.date || undefined,
    };
    setItems((prev) => [it, ...prev]);
    setNewForm(null);
  };

  const updateItem = (id: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Drag and drop
  const onDropTo = (list: NonNullable<typeof newForm>["list"]) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const domain: Domain = list.startsWith("video") ? "video" : "book";
    const status: Status = list.endsWith("done") ? "done" : "backlog";
    setItems((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              domain,
              status,
              date: status === "done" ? x.date || new Date().toISOString().slice(0, 10) : undefined,
            }
          : x
      )
    );
  };

  const byVideoBacklog = useMemo(() => items.filter((i) => i.domain === "video" && i.status === "backlog"), [items]);
  const byVideoDone = useMemo(() => items.filter((i) => i.domain === "video" && i.status === "done"), [items]);
  const byBookBacklog = useMemo(() => items.filter((i) => i.domain === "book" && i.status === "backlog"), [items]);
  const byBookDone = useMemo(() => items.filter((i) => i.domain === "book" && i.status === "done"), [items]);

  const genreCounts = (domain: Domain) => {
    const map = new Map<string, number>();
    for (const i of items) {
      if (i.domain !== domain || i.status !== "done" || !i.genre) continue;
      map.set(i.genre.toLowerCase(), (map.get(i.genre.toLowerCase()) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  };

  const videoTopGenres = genreCounts("video").slice(0, 2);
  const bookTopGenres = genreCounts("book").slice(0, 2);

  // Sugestões locais simples
  const seeds: Record<string, { video: string[]; book: string[] }> = {
    "ação": { video: ["Missão Impossível", "John Wick", "Mad Max: Fury Road"], book: ["O Conde de Monte Cristo"] },
    "drama": { video: ["Clube da Luta", "Forrest Gump"], book: ["A Menina que Roubava Livros", "1984"] },
    "comédia": { video: ["Superbad", "Se Beber, Não Case"], book: ["O Guia do Mochileiro das Galáxias"] },
    "ficção": { video: ["Blade Runner", "Ex Machina"], book: ["Duna", "Neuromancer"] },
    "fantasia": { video: ["O Senhor dos Anéis", "Harry Potter"], book: ["O Nome do Vento", "O Hobbit"] },
    "romance": { video: ["La La Land", "Orgulho e Preconceito"], book: ["Orgulho e Preconceito", "Eleanor & Park"] },
  };

  const buildSuggestions = (domain: Domain) => {
    const top = domain === "video" ? videoTopGenres : bookTopGenres;
    const out: { title: string; genre: string }[] = [];
    for (const g of top) {
      const pool = seeds[g]?.[domain] || [];
      for (const p of pool) out.push({ title: p, genre: g });
      if (out.length >= 6) break;
    }
    if (out.length === 0) {
      // fallback
      out.push({ title: domain === "video" ? "Sugestão de filme" : "Sugestão de livro", genre: "geral" });
    }
    return out.slice(0, 6);
  };

  const videoSuggestions = useMemo(() => buildSuggestions("video"), [items]);
  const bookSuggestions = useMemo(() => buildSuggestions("book"), [items]);

  const ItemCard = ({ item }: { item: Item }) => (
    <article
      className="rounded-md border p-3 flex flex-col gap-3"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="font-medium leading-snug break-words">
            {item.title}
            {item.domain === "video" && item.subtype ? <span className="text-muted-foreground"> · {item.subtype}</span> : null}
          </h4>
          <p className="text-sm text-muted-foreground mt-1 break-words">
            {item.domain === "video" ? (item.platformOrAuthor ? `Plataforma: ${item.platformOrAuthor}` : "") : (item.platformOrAuthor ? `Autor: ${item.platformOrAuthor}` : "")}
            {item.genre ? (item.platformOrAuthor ? " · " : "") + `Gênero: ${item.genre}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>Remover</Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {item.domain === "video" && (
          <Select value={item.subtype} onValueChange={(v) => updateItem(item.id, { subtype: v as VideoSubtype })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filme">Filme</SelectItem>
              <SelectItem value="série">Série</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder={item.domain === "video" ? "Plataforma" : "Autor"}
          value={item.platformOrAuthor || ""}
          onChange={(e) => updateItem(item.id, { platformOrAuthor: e.target.value })}
        />
        <Input placeholder="Gênero" value={item.genre || ""} onChange={(e) => updateItem(item.id, { genre: e.target.value })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Data</label>
          <Input
            type="date"
            className="w-full sm:w-auto"
            value={item.date || ""}
            onChange={(e) => updateItem(item.id, { date: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Nota (1–5)</label>
          <Input
            type="number"
            min={1}
            max={5}
            className="w-24"
            value={item.rating ?? ""}
            onChange={(e) => updateItem(item.id, { rating: e.target.value ? Math.max(1, Math.min(5, Number(e.target.value))) : undefined })}
          />
        </div>
      </div>
    </article>
  );

  const AddForm = ({ list }: { list: NonNullable<typeof newForm>["list"] }) => (
    <div className="rounded-md border p-3 grid gap-2">
      <Input placeholder="Título" value={newForm?.title || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, title: e.target.value } : p))} />
      {list.startsWith("video") ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={newForm?.subtype} onValueChange={(v) => setNewForm((p) => (p ? { ...p, subtype: v as VideoSubtype } : p))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filme">Filme</SelectItem>
              <SelectItem value="série">Série</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Plataforma" value={newForm?.platformOrAuthor || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, platformOrAuthor: e.target.value } : p))} />
          <Input placeholder="Gênero" value={newForm?.genre || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, genre: e.target.value } : p))} />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Autor" value={newForm?.platformOrAuthor || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, platformOrAuthor: e.target.value } : p))} />
          <Input placeholder="Gênero" value={newForm?.genre || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, genre: e.target.value } : p))} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Data</label>
          <Input type="date" value={newForm?.date || ""} onChange={(e) => setNewForm((p) => (p ? { ...p, date: e.target.value } : p))} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Nota (1–5)</label>
          <Input
            type="number"
            min={1}
            max={5}
            className="w-24"
            value={newForm?.rating ?? ""}
            onChange={(e) => setNewForm((p) => (p ? { ...p, rating: e.target.value ? Math.max(1, Math.min(5, Number(e.target.value))) : undefined } : p))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setNewForm(null)}>Cancelar</Button>
        <Button onClick={() => addInline(list)}>Adicionar</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">Cultura</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Vídeos */}
        <section aria-labelledby="videos" className="grid gap-6 grid-cols-1">
          <h2 id="videos" className="sr-only">Filmes e séries</h2>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Próximos a ver</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("video-backlog")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("video-backlog")}
            >
              {newForm?.list === "video-backlog" && <AddForm list="video-backlog" />}
              {byVideoBacklog.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
              {byVideoBacklog.length === 0 && <p className="text-sm text-muted-foreground">Lista vazia.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Assistidos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("video-done")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("video-done")}
            >
              {newForm?.list === "video-done" && <AddForm list="video-done" />}
              {byVideoDone.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
              {byVideoDone.length === 0 && <p className="text-sm text-muted-foreground">Nenhum assistido.</p>}
            </CardContent>
          </Card>
        </section>

        {/* Livros */}
        <section aria-labelledby="books" className="grid gap-6 grid-cols-1">
          <h2 id="books" className="sr-only">Livros</h2>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Próximos a ler</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("book-backlog")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("book-backlog")}
            >
              {newForm?.list === "book-backlog" && <AddForm list="book-backlog" />}
              {byBookBacklog.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
              {byBookBacklog.length === 0 && <p className="text-sm text-muted-foreground">Lista vazia.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Lidos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("book-done")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("book-done")}
            >
              {newForm?.list === "book-done" && <AddForm list="book-done" />}
              {byBookDone.map((i) => (
                <ItemCard key={i.id} item={i} />
              ))}
              {byBookDone.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lido.</p>}
            </CardContent>
          </Card>
        </section>

        {/* Sugestões */}
        <section aria-labelledby="suggestions" className="grid gap-6 md:grid-cols-2">
          <h2 id="suggestions" className="sr-only">Sugestões</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Sugestões de filmes/séries</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {videoSuggestions.map((s, idx) => (
                <div key={`${s.title}-${idx}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium leading-none">{s.title}</p>
                    <p className="text-sm text-muted-foreground">Gênero: {s.genre}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setItems((prev) => [
                        {
                          id: crypto.randomUUID(),
                          domain: "video",
                          status: "backlog",
                          title: s.title,
                          genre: s.genre,
                          subtype: "filme",
                        },
                        ...prev,
                      ])
                    }
                  >
                    Adicionar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Sugestões de livros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {bookSuggestions.map((s, idx) => (
                <div key={`${s.title}-${idx}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium leading-none">{s.title}</p>
                    <p className="text-sm text-muted-foreground">Gênero: {s.genre}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setItems((prev) => [
                        {
                          id: crypto.randomUUID(),
                          domain: "book",
                          status: "backlog",
                          title: s.title,
                          genre: s.genre,
                        },
                        ...prev,
                      ])
                    }
                  >
                    Adicionar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

