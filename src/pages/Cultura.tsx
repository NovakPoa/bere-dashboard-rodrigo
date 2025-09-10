import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState<string>("all-genres");
  const [selectedYear, setSelectedYear] = useState<string>("all-years");
  const [selectedRating, setSelectedRating] = useState<string>("all-ratings");

  // Form inline por lista - using stable object structure to fix cursor issue
  const [newForm, setNewForm] = useState<{
    isOpen: boolean;
    list: "video-backlog" | "video-done" | "book-backlog" | "book-done";
    title: string;
    author: string;
    subtype: "movie" | "series";
    genre: string;
    rating: number;
    year: number;
  }>({
    isOpen: false,
    list: "video-backlog",
    title: "",
    author: "",
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
      author: "",
      subtype: "movie",
      genre: "",
      rating: 0,
      year: 0,
    }));
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

  // Extract unique filter options
  const uniqueGenres = useMemo(() => {
    const genres = items.filter(i => i.genre?.trim()).map(i => i.genre!.trim());
    return [...new Set(genres)].sort();
  }, [items]);

  const uniqueYears = useMemo(() => {
    const years = items.filter(i => i.year).map(i => i.year!);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [items]);

  // Apply filters function
  const applyFilters = (itemList: Item[]) => {
    return itemList.filter(item => {
      if (selectedGenre && selectedGenre !== "all-genres" && item.genre !== selectedGenre) return false;
      if (selectedYear && selectedYear !== "all-years" && item.year?.toString() !== selectedYear) return false;
      if (selectedRating && selectedRating !== "all-ratings") {
        if (selectedRating === "no-rating" && item.rating) return false;
        if (selectedRating !== "no-rating" && item.rating?.toString() !== selectedRating) return false;
      }
      return true;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedGenre("all-genres");
    setSelectedYear("all-years");
    setSelectedRating("all-ratings");
  };

  const byVideoBacklog = useMemo(() => applyFilters(items.filter((i) => i.domain === "videos" && i.status === "backlog")), [items, selectedGenre, selectedYear, selectedRating]);
  const byVideoDone = useMemo(() => applyFilters(items.filter((i) => i.domain === "videos" && i.status === "done")), [items, selectedGenre, selectedYear, selectedRating]);
  const byBookBacklog = useMemo(() => applyFilters(items.filter((i) => i.domain === "books" && i.status === "backlog")), [items, selectedGenre, selectedYear, selectedRating]);
  const byBookDone = useMemo(() => applyFilters(items.filter((i) => i.domain === "books" && i.status === "done")), [items, selectedGenre, selectedYear, selectedRating]);



  const AddForm = React.memo(({ list }: { list: NonNullable<typeof newForm>["list"] }) => {
    // Local form state to prevent cursor jumping
    const [formData, setFormData] = useState({
      title: "",
      author: "",
      subtype: "movie" as "movie" | "series",
      genre: "",
      rating: 0,
      year: 0,
    });

    // Sync form data when form opens/closes
    useEffect(() => {
      if (newForm.isOpen && newForm.list === list) {
        setFormData({
          title: "",
          author: "",
          subtype: "movie",
          genre: "",
          rating: 0,
          year: 0,
        });
      }
    }, [newForm.isOpen, newForm.list, list]);

    // Memoized change handlers to prevent re-renders
    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, title: e.target.value }));
    }, []);

    const handleAuthorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, author: e.target.value }));
    }, []);

    const handleGenreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, genre: e.target.value }));
    }, []);

    const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : 0 }));
    }, []);

    const handleSubtypeChange = useCallback((v: string) => {
      setFormData(prev => ({ ...prev, subtype: v as "movie" | "series" }));
    }, []);

    const handleRatingChange = useCallback((rating: number) => {
      setFormData(prev => ({ ...prev, rating }));
    }, []);

    const handleCancel = useCallback(() => {
      setNewForm(prev => ({ ...prev, isOpen: false }));
      setFormData({
        title: "",
        author: "",
        subtype: "movie",
        genre: "",
        rating: 0,
        year: 0,
      });
    }, []);

    const handleAdd = useCallback(() => {
      if (!formData.title.trim()) return;
      const domain = list.startsWith("video") ? "videos" : "books";
      const status = list.endsWith("done") ? "done" : "backlog";
      const it: Omit<Item, "id"> = {
        domain: domain as "videos" | "books",
        status: status as "done" | "backlog",
        title: formData.title.trim(),
        author: formData.author?.trim() || undefined,
        subtype: domain === "videos" ? formData.subtype : undefined,
        genre: formData.genre?.trim() || undefined,
        rating: formData.rating || undefined,
        year: formData.year || undefined,
      };
      addItem.mutate(it);
      setNewForm(prev => ({ ...prev, isOpen: false }));
      setFormData({
        title: "",
        author: "",
        subtype: "movie",
        genre: "",
        rating: 0,
        year: 0,
      });
    }, [formData, list, addItem]);

    return (
      <div className="rounded-md border p-3 grid gap-2">
        <Input 
          placeholder="Título" 
          value={formData.title} 
          onChange={handleTitleChange}
          autoFocus
        />
        <Input 
          placeholder="Autor" 
          value={formData.author} 
          onChange={handleAuthorChange}
        />
        {list.startsWith("video") ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={formData.subtype} onValueChange={handleSubtypeChange}>
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
              value={formData.genre} 
              onChange={handleGenreChange} 
            />
            <Input 
              type="number" 
              placeholder="Ano" 
              value={formData.year || ""} 
              onChange={handleYearChange} 
            />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input 
              placeholder="Gênero" 
              value={formData.genre} 
              onChange={handleGenreChange} 
            />
            <Input 
              type="number" 
              placeholder="Ano" 
              value={formData.year || ""} 
              onChange={handleYearChange} 
            />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Nota</label>
            <StarRating
              rating={formData.rating}
              onRatingChange={handleRatingChange}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </div>
      </div>
    );
  });

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <header className="py-4 md:py-6">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Cultura</h1>
      </header>

      {/* Filters Section */}
      <section className="space-y-4 mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-3 flex-1">
            {/* Genre Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gênero</label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os gêneros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-genres">Todos os gêneros</SelectItem>
                  {uniqueGenres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os anos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-years">Todos os anos</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avaliação</label>
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as notas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-ratings">Todas as notas</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                  <SelectItem value="2">⭐⭐ (2)</SelectItem>
                  <SelectItem value="1">⭐ (1)</SelectItem>
                  <SelectItem value="no-rating">Sem nota</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            disabled={selectedGenre === "all-genres" && selectedYear === "all-years" && selectedRating === "all-ratings"}
            className="sm:ml-4"
          >
            Limpar Filtros
          </Button>
        </div>
      </section>

      <main className="space-y-6 md:space-y-8">
        {/* Vídeos */}
        <section aria-labelledby="videos" className="grid gap-6 grid-cols-1">
          <h2 id="videos" className="sr-only">Filmes e séries</h2>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Filmes e séries para ver</CardTitle>
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
              {newForm.isOpen && newForm.list === "video-backlog" && <AddForm key="video-backlog" list="video-backlog" />}
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
              <CardTitle className="text-sm text-muted-foreground">Filmes e séries assistidos</CardTitle>
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
              {newForm.isOpen && newForm.list === "video-done" && <AddForm key="video-done" list="video-done" />}
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
              <CardTitle className="text-sm text-muted-foreground">Livros para ler</CardTitle>
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
              {newForm.isOpen && newForm.list === "book-backlog" && <AddForm key="book-backlog" list="book-backlog" />}
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
              <CardTitle className="text-sm text-muted-foreground">Livros lidos</CardTitle>
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
              {newForm.isOpen && newForm.list === "book-done" && <AddForm key="book-done" list="book-done" />}
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

      </main>
    </div>
  );
}