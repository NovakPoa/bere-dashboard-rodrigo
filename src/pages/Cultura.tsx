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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

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
  const [selectedContentType, setSelectedContentType] = useState<string>("all");

  // Pagination states (simplified to 2)
  const [backlogPage, setBacklogPage] = useState(1);
  const [donePage, setDonePage] = useState(1);

  // Form inline por lista - using stable object structure to fix cursor issue
  const [newForm, setNewForm] = useState<{
    isOpen: boolean;
    list: "backlog" | "done";
    title: string;
    author: string;
    subtype: "movie" | "series";
    genre: string;
    rating: number;
    year: number;
  }>({
    isOpen: false,
    list: "backlog",
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
    const item = items.find(x => x.id === id);
    if (!item) return;
    
    handleUpdateItem(id, {
      ...item,
      status: list as "done" | "backlog",
      year: list === "done" ? item.year || new Date().getFullYear() : undefined,
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
      // Content type filter
      if (selectedContentType !== "all") {
        if (selectedContentType === "books" && item.domain !== "books") return false;
        if (selectedContentType === "movies" && (item.domain !== "videos" || item.subtype !== "movie")) return false;
        if (selectedContentType === "series" && (item.domain !== "videos" || item.subtype !== "series")) return false;
      }
      
      // Other filters
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
    setSelectedContentType("all");
  };

  // Combined item lists with filters
  const backlogItems = useMemo(() => applyFilters(items.filter((i) => i.status === "backlog")), [items, selectedGenre, selectedYear, selectedRating, selectedContentType]);
  const doneItems = useMemo(() => applyFilters(items.filter((i) => i.status === "done")), [items, selectedGenre, selectedYear, selectedRating, selectedContentType]);

  // Total counts for display in titles (with content type filter applied)
  const totalBacklog = useMemo(() => {
    const filteredItems = items.filter((i) => i.status === "backlog");
    if (selectedContentType === "all") return filteredItems.length;
    if (selectedContentType === "books") return filteredItems.filter(i => i.domain === "books").length;
    if (selectedContentType === "movies") return filteredItems.filter(i => i.domain === "videos" && i.subtype === "movie").length;
    if (selectedContentType === "series") return filteredItems.filter(i => i.domain === "videos" && i.subtype === "series").length;
    return filteredItems.length;
  }, [items, selectedContentType]);

  const totalDone = useMemo(() => {
    const filteredItems = items.filter((i) => i.status === "done");
    if (selectedContentType === "all") return filteredItems.length;
    if (selectedContentType === "books") return filteredItems.filter(i => i.domain === "books").length;
    if (selectedContentType === "movies") return filteredItems.filter(i => i.domain === "videos" && i.subtype === "movie").length;
    if (selectedContentType === "series") return filteredItems.filter(i => i.domain === "videos" && i.subtype === "series").length;
    return filteredItems.length;
  }, [items, selectedContentType]);

  // Reset pages when filters change
  useEffect(() => {
    setBacklogPage(1);
    setDonePage(1);
  }, [selectedGenre, selectedYear, selectedRating, selectedContentType]);

  // Pagination logic
  const createPaginationLogic = (items: Item[], currentPage: number) => {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = items.slice(startIndex, endIndex);
    
    return { currentItems, totalPages, startIndex, endIndex };
  };

  // Get paginated data
  const backlogPaginated = useMemo(() => createPaginationLogic(backlogItems, backlogPage), [backlogItems, backlogPage]);
  const donePaginated = useMemo(() => createPaginationLogic(doneItems, donePage), [doneItems, donePage]);

  // Pagination controls component
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex flex-col gap-3 mt-4">
        <div className="text-sm text-muted-foreground text-center">
          Mostrando {startItem}-{endItem} de {totalItems} itens
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {/* First page */}
            {currentPage > 3 && (
              <>
                <PaginationItem>
                  <PaginationLink 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); onPageChange(1); }}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {currentPage > 4 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}
            
            {/* Current page and neighbors */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => Math.abs(page - currentPage) <= 2)
              .map(page => (
                <PaginationItem key={page}>
                  <PaginationLink 
                    href="#"
                    onClick={(e) => { e.preventDefault(); onPageChange(page); }}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
            
            {/* Last page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); onPageChange(totalPages); }}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
            
            <PaginationItem>
              <PaginationNext 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  const AddForm = React.memo(({ list }: { list: NonNullable<typeof newForm>["list"] }) => {
    // Local form state to prevent cursor jumping
    const [formData, setFormData] = useState({
      title: "",
      author: "",
      domain: "books" as "books" | "videos",
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
          domain: "books",
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

    const handleDomainChange = useCallback((v: string) => {
      setFormData(prev => ({ ...prev, domain: v as "books" | "videos" }));
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
        domain: "books",
        subtype: "movie",
        genre: "",
        rating: 0,
        year: 0,
      });
    }, []);

    const handleAdd = useCallback(() => {
      if (!formData.title.trim()) return;
      const it: Omit<Item, "id"> = {
        domain: formData.domain,
        status: list as "done" | "backlog",
        title: formData.title.trim(),
        author: formData.author?.trim() || undefined,
        subtype: formData.domain === "videos" ? formData.subtype : undefined,
        genre: formData.genre?.trim() || undefined,
        rating: formData.rating || undefined,
        year: formData.year || undefined,
      };
      addItem.mutate(it);
      setNewForm(prev => ({ ...prev, isOpen: false }));
      setFormData({
        title: "",
        author: "",
        domain: "books",
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
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={formData.domain} onValueChange={handleDomainChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="books">Livro</SelectItem>
              <SelectItem value="videos">Filme/Série</SelectItem>
            </SelectContent>
          </Select>
          {formData.domain === "videos" && (
            <Select value={formData.subtype} onValueChange={handleSubtypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Subtipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Filme</SelectItem>
                <SelectItem value="series">Série</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input 
            placeholder="Gênero" 
            value={formData.genre} 
            onChange={handleGenreChange} 
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input 
            type="number" 
            placeholder="Ano" 
            value={formData.year || ""} 
            onChange={handleYearChange} 
          />
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
          <div className="grid gap-3 sm:grid-cols-4 flex-1">
            {/* Content Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Conteúdo</label>
              <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="books">Livros</SelectItem>
                  <SelectItem value="movies">Filmes</SelectItem>
                  <SelectItem value="series">Séries</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
            disabled={selectedGenre === "all-genres" && selectedYear === "all-years" && selectedRating === "all-ratings" && selectedContentType === "all"}
            className="sm:ml-4"
          >
            Limpar Filtros
          </Button>
        </div>
      </section>

      <main className="space-y-6 md:space-y-8">
        {/* Para consumir */}
        <section className="grid gap-6 grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Para consumir ({totalBacklog})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("backlog")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("backlog")}
            >
              {newForm.isOpen && newForm.list === "backlog" && <AddForm key="backlog" list="backlog" />}
              {backlogPaginated.currentItems.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
              ))}
              {!isLoading && backlogItems.length === 0 && (
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
              
              <PaginationControls
                currentPage={backlogPage}
                totalPages={backlogPaginated.totalPages}
                onPageChange={setBacklogPage}
                totalItems={backlogItems.length}
              />
            </CardContent>
          </Card>
        </section>

        {/* Consumidos */}
        <section className="grid gap-6 grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Consumidos ({totalDone})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleNew("done")}>+</Button>
            </CardHeader>
            <CardContent
              className="grid gap-3 min-h-32"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onDropTo("done")}
            >
              {newForm.isOpen && newForm.list === "done" && <AddForm key="done" list="done" />}
              {donePaginated.currentItems.map((i) => (
                <CompactItemCard 
                  key={i.id} 
                  item={i} 
                  onUpdate={handleUpdateItem} 
                  onRemove={handleRemoveItem} 
                />
              ))}
              {doneItems.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item consumido.</p>}
              
              <PaginationControls
                currentPage={donePage}
                totalPages={donePaginated.totalPages}
                onPageChange={setDonePage}
                totalItems={doneItems.length}
              />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
