
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Coffee, UtensilsCrossed, Apple, Zap, Beef, Wheat, Droplets } from "lucide-react";

import { FoodEntry } from "@/hooks/useNutrition";

interface RecentMealsProps {
  entries: FoodEntry[];
  dateRange?: { from: Date; to: Date };
}

const getMealIcon = (mealType: string) => {
  switch (mealType.toLowerCase()) {
    case "café da manhã":
      return Coffee;
    case "almoço":
      return UtensilsCrossed;
    case "lanche":
      return Apple;
    case "jantar":
      return UtensilsCrossed;
    default:
      return UtensilsCrossed;
  }
};

const getMealVariant = (mealType: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (mealType.toLowerCase()) {
    case "café da manhã":
      return "default";
    case "almoço":
      return "secondary";
    case "lanche":
      return "outline";
    case "jantar":
      return "destructive";
    default:
      return "default";
  }
};

export default function RecentMeals({ entries, dateRange }: RecentMealsProps) {
  const filteredEntries = entries
    .filter(entry => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const entryDate = new Date(entry.date);
      return entryDate >= dateRange.from && entryDate <= dateRange.to;
    })
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Refeições</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma refeição encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry, index) => {
              const MealIcon = getMealIcon(entry.mealType);
              return (
                <Card key={index} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <MealIcon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={getMealVariant(entry.mealType)} className="text-xs">
                          {entry.mealType}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {format(new Date(entry.date), "dd/MM", { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="flex-1 max-w-md">
                      <p className="text-sm truncate">{entry.description}</p>
                    </div>
                    
                     <div className="grid grid-cols-2 sm:flex sm:gap-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span className="text-muted-foreground">Cal:</span>
                        <span className="font-mono">{entry.calories?.toLocaleString() || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Beef className="h-3 w-3 text-red-500" />
                        <span className="text-muted-foreground">Prot:</span>
                        <span className="font-mono">{entry.protein}g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wheat className="h-3 w-3 text-orange-500" />
                        <span className="text-muted-foreground">Carb:</span>
                        <span className="font-mono">{entry.carbs}g</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">Gord:</span>
                        <span className="font-mono">{entry.fat}g</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
