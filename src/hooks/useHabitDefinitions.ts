import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HabitDefinition {
  id: string;
  name: string;
  targetSessions: number;
  targetTimeMinutes: number;
  createdAt: string;
}

export function useHabitDefinitions() {
  return useQuery({
    queryKey: ["habit-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_definitions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map((habit): HabitDefinition => ({
        id: habit.id,
        name: habit.name,
        targetSessions: habit.target_sessions,
        targetTimeMinutes: habit.target_time_minutes,
        createdAt: habit.created_at,
      }));
    },
  });
}

export function useAddHabitDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      name, 
      targetSessions, 
      targetTimeMinutes 
    }: { 
      name: string; 
      targetSessions: number; 
      targetTimeMinutes: number; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado. Faça login para criar hábitos.");
      }

      const { data, error } = await supabase
        .from("habit_definitions")
        .insert([{
          user_id: user.id,
          name,
          target_sessions: targetSessions,
          target_time_minutes: targetTimeMinutes,
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        targetSessions: data.target_sessions,
        targetTimeMinutes: data.target_time_minutes,
        createdAt: data.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["habit-sessions"] });
      toast({
        title: "Hábito criado",
        description: "Hábito foi criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar hábito: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteHabitDefinition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("habit_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["habit-sessions"] });
      toast({
        title: "Hábito removido",
        description: "Hábito foi removido com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover hábito: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}