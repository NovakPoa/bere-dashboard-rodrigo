import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({ rating = 0, onRatingChange, readonly = false, size = "sm" }: StarRatingProps) {
  const starSize = size === "sm" ? 16 : 20;
  
  const handleStarClick = (newRating: number) => {
    if (readonly || !onRatingChange) return;
    // Prevent page scroll by stopping propagation
    onRatingChange(newRating);
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={cn(
            "transition-colors hover:text-yellow-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            readonly ? "cursor-default" : "cursor-pointer",
            star <= rating ? "text-yellow-500" : "text-muted-foreground"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStarClick(star);
          }}
          disabled={readonly}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star 
            size={starSize} 
            className={star <= rating ? "fill-current" : ""} 
          />
        </button>
      ))}
    </div>
  );
}