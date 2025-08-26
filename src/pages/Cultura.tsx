import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCultureItems, useAddCultureItem, useUpdateCultureItem, useRemoveCultureItem, type Item } from "@/hooks/useCulture";
import { useProfile } from "@/hooks/useProfile";
import { useLinkHistoricalData } from "@/hooks/useProfile";
import { CompactItemCard } from "@/components/culture/CompactItemCard";
import { StarRating } from "@/components/culture/StarRating";

export default function Cultura() {
  const { data: items = [], isLoading } = useCultureItems();
  const { data: profile } = useProfile();
  const linkHistoricalData = useLinkHistoricalData();
  const addItem = useAddCultureItem();
  const updateItem = useUpdateCultureItem();
  const removeItem = useRemoveCultureItem();
  
  useEffect(() => setPageSEO("Cultura", "Listas de filmes, séries e livros"), []);

  // Form inline por lista - using stable object structure to fix cursor issue
  const [newForm, setNewForm] = useState<{
    isOpen: boolean;
    list: "video-backlog" | "video-done" | "book-backlog" | "book-done";
    title: string;
    subtype: "movie" | "series";
    genre: string;
    rating: number;
    year: number;
  }>({
    isOpen: false,
    list: "video-backlog",
    title: "",
    subtype: "movie",
    genre: "",
    rating: 0,
    year: 0,
  });

  const toggleNew = (list: NonNullable<typeof newForm>["list"]) => {
    setNewForm((prev) => ({
      ...prev,
      isOpen: prev.isOpen && prev.list === list ? false : true,
      list,
      title: "",
      subtype: "movie",
      genre: "",
      rating: 0,
      year: 0,
    }));
  };

  const addInline = (list: NonNullable<typeof newForm>["list"]) => {
    if (!newForm.title.trim()) return;
    const domain = list.startsWith("video") ? "videos" : "books";
    const status = list.endsWith("done") ? "done" : "backlog";
    const it: Omit<Item, "id"> = {
      domain: domain as "videos" | "books",
      status: status as "done" | "backlog",
      title: newForm.title.trim(),
      subtype: domain === "videos" ? newForm.subtype : undefined,
      genre: newForm.genre?.trim() || undefined,
      rating: newForm.rating || undefined,
      year: newForm.year || undefined,
    };
    addItem.mutate(it);
    setNewForm((prev) => ({ ...prev, isOpen: false, title: "", genre: "", rating: 0, year: 0 }));
  };

  const handleUpdateItem = (id: string, patch: Partial<Item>) => updateItem.mutate({ id, updates: patch });
  const handleRemoveItem = (id: string) => removeItem.mutate(id);

  // Drag and drop
  const onDropTo = (list: NonNullable<typeof newForm>["list"]) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const domain = list.startsWith("video") ? "videos" : "books";
    const status = list.endsWith("done") ? "done" : "backlog";
    const item = items.find(x => x.id === id);
    if (!item) return;
    
    handleUpdateItem(id, {
      ...item,
      domain: domain as "videos" | "books",
      status: status as "done" | "backlog",
      year: status === "done" ? item.year || new Date().getFullYear() : undefined,
    });
  };

  const byVideoBacklog = useMemo(() => items.filter((i) => i.domain === "videos" && i.status === "backlog"), [items]);
  const byVideoDone = useMemo(() => items.filter((i) => i.domain === "videos" && i.status === "done"), [items]);
  const byBookBacklog = useMemo(() => items.filter((i) => i.domain === "books" && i.status === "backlog"), [items]);
  const byBookDone = useMemo(() => items.filter((i) => i.domain === "books" && i.status === "done"), [items]);

  const genreCounts = (domain: "videos" | "books") => {
    const map = new Map<string, number>();
    for (const i of items) {
      if (i.domain !== domain || i.status !== "done" || !i.genre) continue;
      map.set(i.genre.toLowerCase(), (map.get(i.genre.toLowerCase()) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  };

  const videoTopGenres = genreCounts("videos").slice(0, 2);
  const bookTopGenres = genreCounts("books").slice(0, 2);

  // Sugestões locais simples
  const seeds: Record<string, { videos: string[]; books: string[] }> = {
    "ação": { videos: ["Missão Impossível", "John Wick", "Mad Max: Fury Road"], books: ["O Conde de Monte Cristo"] },
    "drama": { videos: ["Clube da Luta", "Forrest Gump"], books: ["A Menina que Roubava Livros", "1984"] },
    "comédia": { videos: ["Superbad", "Se Beber, Não Case"], books: ["O Guia do Mochileiro das Galáxias"] },
    "ficção": { videos: ["Blade Runner", "Ex Machina"], books: ["Duna", "Neuromancer"] },
    "fantasia": { videos: ["O Senhor dos Anéis", "Harry Potter"], books: ["O Nome do Vento", "O Hobbit"] },
    "romance": { videos: ["La La Land", "Orgulho e Preconceito"], books: ["Orgulho e Preconceito", "Eleanor & Park"] },
  };

  const buildSuggestions = (domain: "videos" | "books") => {
    const top = domain === "videos" ? videoTopGenres : bookTopGenres;
    const out: { title: string; genre: string }[] = [];
    for (const g of top) {
      const pool = seeds[g]?.[domain] || [];
      for (const p of pool) out.push({ title: p, genre: g });
      if (out.length >= 6) break;
    }
    if (out.length === 0) {
      // fallback
      out.push({ title: domain === "videos" ? "Sugestão de filme" : "Sugestão de livro", genre: "geral" });
    }
    return out.slice(0, 6);
  };

  const videoSuggestions = useMemo(() => buildSuggestions("videos"), [items]);
  const bookSuggestions = useMemo(() => buildSuggestions("books"), [items]);


  const AddForm = ({ list }: { list: NonNullable<typeof newForm>["list"] }) => (
    <div className="rounded-md border p-3 grid gap-2">
      <Input 
        placeholder="Título" 
        value={newForm.title} 
        onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
        autoFocus
      />
      {list.startsWith("video") ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={newForm.subtype} onValueChange={(v) => setNewForm((prev) => ({ ...prev, subtype: v as "movie" | "series" }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Filme</SelectItem>
              <SelectItem value="series">Série</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            placeholder="Gênero" 
            value={newForm.genre} 
            onChange={(e) => setNewForm((prev) => ({ ...prev, genre: e.target.value }))} 
          />
          <Input 
            type="number" 
            placeholder="Ano" 
            value={newForm.year || ""} 
            onChange={(e) => setNewForm((prev) => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : 0 }))} 
          />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input 
            placeholder="Gênero" 
            value={newForm.genre} 
            onChange={(e) => setNewForm((prev) => ({ ...prev, genre: e.target.value }))} 
          />
          <Input 
            type="number" 
            placeholder="Ano" 
            value={newForm.year || ""} 
            onChange={(e) => setNewForm((prev) => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : 0 }))} 
          />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Nota</label>
          <StarRating
            rating={newForm.rating}
            onRatingChange={(rating) => setNewForm((prev) => ({ ...prev, rating }))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setNewForm((prev) => ({ ...prev, isOpen: false }))}>Cancelar</Button>
        <Button onClick={() => addInline(list)}>Adicionar</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="container py-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Cultura</h1>
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
              {newForm.isOpen && newForm.list === "video-backlog" && <AddForm list="video-backlog" />}
              {byVideoBacklog.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
              ))}
              {!isLoading && byVideoBacklog.length === 0 && (
                <div className="text-center space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">
                    {items.length === 0 ? "Nenhum item encontrado para o seu usuário atual" : "Lista vazia."}
                  </p>
                  {items.length === 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                        Recarregar
                      </Button>
                      {profile?.phone_number && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => linkHistoricalData.mutate(profile?.phone_number!)}
                          disabled={linkHistoricalData.isPending}
                        >
                          {linkHistoricalData.isPending ? "Vinculando..." : "Vincular meus dados do WhatsApp"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
              {newForm.isOpen && newForm.list === "video-done" && <AddForm list="video-done" />}
              {byVideoDone.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
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
              {newForm.isOpen && newForm.list === "book-backlog" && <AddForm list="book-backlog" />}
              {byBookBacklog.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
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
              {newForm.isOpen && newForm.list === "book-done" && <AddForm list="book-done" />}
              {byBookDone.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
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
                      addItem.mutate({
                        domain: "videos",
                        status: "backlog",
                        title: s.title,
                        genre: s.genre,
                        subtype: "movie",
                      })
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
                      addItem.mutate({
                        domain: "books",
                        status: "backlog",
                        title: s.title,
                        genre: s.genre,
                      })
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