import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "./StarRating";
import { type Item } from "@/hooks/useCulture";
import { Trash2, Edit3 } from "lucide-react";

interface CompactItemCardProps {
  item: Item;
  onUpdate: (id: string, patch: Partial<Item>) => void;
  onRemove: (id: string) => void;
}

export function CompactItemCard({ item, onUpdate, onRemove }: CompactItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    title: item.title,
    author: item.author || "",
    genre: item.genre || "",
    year: item.year || "",
    subtype: item.subtype || "movie"
  });

  // Sync edit values when item changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValues({
        title: item.title,
        author: item.author || "",
        genre: item.genre || "",
        year: item.year || "",
        subtype: item.subtype || "movie"
      });
    }
  }, [item, isEditing]);

  const handleSave = () => {
    onUpdate(item.id, {
      title: editValues.title.trim(),
      author: editValues.author.trim() || undefined,
      genre: editValues.genre.trim() || undefined,
      year: editValues.year ? parseInt(editValues.year.toString()) : undefined,
      subtype: item.domain === "videos" ? editValues.subtype : undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      title: item.title,
      author: item.author || "",
      genre: item.genre || "",
      year: item.year || "",
      subtype: item.subtype || "movie"
    });
    setIsEditing(false);
  };

  const handleRatingChange = (rating: number) => {
    onUpdate(item.id, { rating });
  };

  if (isEditing) {
    return (
      <div 
        className="p-2 bg-muted/50 rounded-md space-y-3"
        draggable={false}
      >
        {/* Title input - full width */}
        <Input
          value={editValues.title}
          onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
          className="w-full"
          placeholder="Título"
        />
        
        {/* Author input - full width */}
        <Input
          value={editValues.author}
          onChange={(e) => setEditValues(prev => ({ ...prev, author: e.target.value }))}
          className="w-full"
          placeholder="Autor"
        />
        
        {/* Other fields in responsive grid */}
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <Input
            value={editValues.genre}
            onChange={(e) => setEditValues(prev => ({ ...prev, genre: e.target.value }))}
            placeholder="Gênero"
          />
          <Input
            type="number"
            value={editValues.year}
            onChange={(e) => setEditValues(prev => ({ ...prev, year: e.target.value }))}
            placeholder="Ano"
          />
          {item.domain === "videos" && (
            <Select 
              value={editValues.subtype} 
              onValueChange={(v) => setEditValues(prev => ({ ...prev, subtype: v as "movie" | "series" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Filme</SelectItem>
                <SelectItem value="series">Série</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button size="sm" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-2 hover:bg-muted/50 rounded-md group transition-colors"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      {/* Mobile: Stack vertically, Desktop: Single row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* First row: Title + Action buttons */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-1 min-w-0">
            <span className="font-medium truncate block">
              {item.title}
              {item.domain === "videos" && item.subtype && (
                <span className="text-muted-foreground text-sm ml-1">
                  · {item.subtype === "movie" ? "Filme" : "Série"}
                </span>
              )}
            </span>
            {item.author && (
              <span className="text-sm text-muted-foreground truncate block">
                {item.author}
              </span>
            )}
          </div>
          
          {/* Action buttons - always visible on mobile */}
          <div className="flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="h-6 w-6 p-0"
              >
                <Edit3 size={12} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Second row on mobile / Right side on desktop: Genre + Year + Stars */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            {item.genre && (
              <span className="truncate max-w-20 sm:max-w-none">{item.genre}</span>
            )}
            {item.year && (
              <span className="flex-shrink-0 w-8 sm:w-12">{item.year}</span>
            )}
          </div>
          
          <div className="flex-shrink-0">
            <StarRating
              rating={item.rating}
              onRatingChange={handleRatingChange}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}