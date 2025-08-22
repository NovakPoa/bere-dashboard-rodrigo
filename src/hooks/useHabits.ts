import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Habit {
  id: string;
  name: string;
  targetSessions: number;
  targetTime: number;
  createdAt: number;
}

export interface HabitSession {
  id: string;
  habitId: string;
  date: string;
  sessions: number;
  timeSpent: number;
}

interface HabitRecord {
  id: number;
  nome: string;
  quantidade_sessoes: number;
  tempo_total_sessoes: number;
  data: string;
  origem: string;
  user_id?: string;
}

const convertToHabit = (record: HabitRecord): Habit => ({
  id: record.id.toString(),
  name: record.nome,
  targetSessions: record.quantidade_sessoes || 1,
  targetTime: record.tempo_total_sessoes || 30,
  createdAt: new Date(record.data).getTime(),
});

const convertFromHabit = (habit: Omit<Habit, "id">) => ({
  nome: habit.name,
  quantidade_sessoes: habit.targetSessions,
  tempo_total_sessoes: habit.targetTime,
  data: new Date(habit.createdAt).toISOString().split('T')[0],
  origem: "manual",
  tipo: "habito",
});

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habitos")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;
      
      return data.map(convertToHabit);
    },
  });
}

export function useAddHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, targetSessions, targetTime }: { name: string; targetSessions: number; targetTime: number }) => {
      const record = convertFromHabit({
        name,
        targetSessions,
        targetTime,
        createdAt: Date.now(),
      });

      const { data, error } = await supabase
        .from("habitos")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      
      return convertToHabit(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast({
        title: "Hábito adicionado",
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

// Note: For habit sessions, we'll continue using localStorage for now since the habits table
// doesn't have the proper structure for session tracking (multiple entries per habit per day)
// This would require a separate habit_sessions table in the future
export function useHabitSessions() {
  const updateSession = (habitId: string, date: string, sessions: number, timeSpent: number) => {
    // For now, continue using localStorage for sessions until we create a proper sessions table
    const SESSIONS_KEY = "habit_sessions_v2";
    const allSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    const sessionIndex = allSessions.findIndex((s: any) => s.habitId === habitId && s.date === date);
    
    if (sessionIndex >= 0) {
      if (sessions === 0 && timeSpent === 0) {
        allSessions.splice(sessionIndex, 1);
      } else {
        allSessions[sessionIndex] = { ...allSessions[sessionIndex], sessions, timeSpent };
      }
    } else if (sessions > 0 || timeSpent > 0) {
      allSessions.push({
        id: `session-${Date.now()}`,
        habitId,
        date,
        sessions,
        timeSpent,
      });
    }
    
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(allSessions));
  };

  const getSessionForDate = (habitId: string, date: string) => {
    const SESSIONS_KEY = "habit_sessions_v2";
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    return sessions.find((s: any) => s.habitId === habitId && s.date === date) || null;
  };

  return { updateSession, getSessionForDate };
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("habitos")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
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