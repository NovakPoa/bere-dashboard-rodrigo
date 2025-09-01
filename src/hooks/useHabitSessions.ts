
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface HabitSession {
  id: string;
  habitId: string;
  date: string;
  sessionsCompleted: number;
  timeSpentMinutes: number;
}

export function useHabitSessions(habitId?: string, startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["habit-sessions", habitId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("habit_sessions")
        .select("*")
        .order("date", { ascending: false });

      if (habitId) {
        query = query.eq("habit_id", habitId);
      }

      if (startDate) {
        query = query.gte("date", format(startDate, "yyyy-MM-dd"));
      }

      if (endDate) {
        query = query.lte("date", format(endDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data.map((session): HabitSession => ({
        id: session.id,
        habitId: session.habit_id,
        date: session.date,
        sessionsCompleted: session.sessions_completed,
        timeSpentMinutes: session.time_spent_minutes,
      }));
    },
    enabled: Boolean(habitId),
  });
}

export function useHabitSessionForDate(habitId: string, date: Date) {
  const dateStr = format(date, "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["habit-session", habitId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_sessions")
        .select("*")
        .eq("habit_id", habitId)
        .eq("date", dateStr)
        .maybeSingle();

      if (error) throw error;
      
      return data ? {
        id: data.id,
        habitId: data.habit_id,
        date: data.date,
        sessionsCompleted: data.sessions_completed,
        timeSpentMinutes: data.time_spent_minutes,
      } : null;
    },
  });
}

export function useUpdateHabitSession(silent = false) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      habitId, 
      date, 
      sessionsCompleted, 
      timeSpentMinutes 
    }: { 
      habitId: string; 
      date: Date; 
      sessionsCompleted: number; 
      timeSpentMinutes: number; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const dateStr = format(date, "yyyy-MM-dd");

      if (sessionsCompleted === 0 && timeSpentMinutes === 0) {
        // Delete the session if both values are 0
        const { error } = await supabase
          .from("habit_sessions")
          .delete()
          .eq("habit_id", habitId)
          .eq("date", dateStr);

        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from("habit_sessions")
        .upsert({
          habit_id: habitId,
          user_id: user.id,
          date: dateStr,
          sessions_completed: sessionsCompleted,
          time_spent_minutes: timeSpentMinutes,
        }, {
          onConflict: 'habit_id,date'
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        habitId: data.habit_id,
        date: data.date,
        sessionsCompleted: data.sessions_completed,
        timeSpentMinutes: data.time_spent_minutes,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["habit-session"] });
      if (!silent) {
        toast({
          title: "Progresso salvo",
          description: "Progresso do hábito foi atualizado!",
        });
      }
    },
    onError: (error: Error) => {
      if (!silent) {
        toast({
          title: "Erro",
          description: `Falha ao salvar progresso: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });
}
