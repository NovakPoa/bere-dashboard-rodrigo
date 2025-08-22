import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FoodEntry {
  id: string;
  description: string;
  mealType: "café da manhã" | "almoço" | "lanche" | "jantar";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}

interface NutritionRecord {
  id: number;
  texto: string;
  refeicao: string;
  calorias_kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  data: string;
  origem: string;
  user_id?: string;
}

const convertToFoodEntry = (record: NutritionRecord): FoodEntry => ({
  id: record.id.toString(),
  description: record.texto,
  mealType: record.refeicao as FoodEntry["mealType"],
  calories: record.calorias_kcal,
  protein: record.proteina_g,
  carbs: record.carboidrato_g,
  fat: record.gordura_g,
  date: record.data,
});

const convertFromFoodEntry = (entry: Omit<FoodEntry, "id">) => ({
  texto: entry.description,
  refeicao: entry.mealType,
  calorias_kcal: entry.calories,
  proteina_g: entry.protein,
  carboidrato_g: entry.carbs,
  gordura_g: entry.fat,
  data: entry.date,
  origem: "manual",
  tipo: "alimentacao",
});

export function useFoodEntries() {
  return useQuery({
    queryKey: ["food-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alimentacao")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;
      
      return data.map(convertToFoodEntry);
    },
  });
}

export function useAddFoodEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: Omit<FoodEntry, "id">) => {
      const record = convertFromFoodEntry(entry);

      const { data, error } = await supabase
        .from("alimentacao")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      
      return convertToFoodEntry(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-entries"] });
      toast({
        title: "Refeição adicionada",
        description: "Refeição foi salva com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao salvar refeição: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}