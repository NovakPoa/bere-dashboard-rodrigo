import { useState } from "react";
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
    genre: item.genre || "",
    year: item.year || "",
    subtype: item.subtype || "movie"
  });

  const handleSave = () => {
    onUpdate(item.id, {
      title: editValues.title.trim(),
      genre: editValues.genre.trim() || undefined,
      year: editValues.year ? parseInt(editValues.year.toString()) : undefined,
      subtype: item.domain === "videos" ? editValues.subtype : undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      title: item.title,
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
        className="flex items-center gap-3 p-2 bg-muted/50 rounded-md"
        draggable={false}
      >
        <Input
          value={editValues.title}
          onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
          className="flex-1 min-w-0"
          placeholder="Título"
        />
        <Input
          value={editValues.genre}
          onChange={(e) => setEditValues(prev => ({ ...prev, genre: e.target.value }))}
          className="w-24 flex-shrink-0"
          placeholder="Gênero"
        />
        <Input
          type="number"
          value={editValues.year}
          onChange={(e) => setEditValues(prev => ({ ...prev, year: e.target.value }))}
          className="w-20 flex-shrink-0"
          placeholder="Ano"
        />
        {item.domain === "videos" && (
          <Select 
            value={editValues.subtype} 
            onValueChange={(v) => setEditValues(prev => ({ ...prev, subtype: v as "movie" | "series" }))}
          >
            <SelectTrigger className="w-20 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Filme</SelectItem>
              <SelectItem value="series">Série</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave}>Salvar</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md group transition-colors"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">
          {item.title}
          {item.domain === "videos" && item.subtype && (
            <span className="text-muted-foreground text-sm ml-1">
              · {item.subtype === "movie" ? "Filme" : "Série"}
            </span>
          )}
        </span>
      </div>
      
      <div className="flex-shrink-0 text-sm text-muted-foreground min-w-0">
        {item.genre && (
          <span className="truncate block">{item.genre}</span>
        )}
      </div>
      
      <div className="flex-shrink-0 text-sm text-muted-foreground w-12">
        {item.year && <span>{item.year}</span>}
      </div>
      
      <div className="flex-shrink-0">
        <StarRating
          rating={item.rating}
          onRatingChange={handleRatingChange}
        />
      </div>
      
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
  );
}