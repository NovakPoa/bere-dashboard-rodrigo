
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
        .order("updated_at", { ascending: false })
        .limit(1)
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

      // Always upsert the session, even when values are zero
      // This avoids delete/recreate loops and keeps a stable record.

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
    onMutate: async (variables) => {
      const { habitId, date, sessionsCompleted, timeSpentMinutes } = variables as {
        habitId: string;
        date: Date;
        sessionsCompleted: number;
        timeSpentMinutes: number;
      };

      const dateStr = format(date, "yyyy-MM-dd");

      await queryClient.cancelQueries({ queryKey: ["habit-session", habitId, dateStr] });
      await queryClient.cancelQueries({ queryKey: ["habit-sessions", habitId] });

      const previousSingle = queryClient.getQueryData<HabitSession | null>(["habit-session", habitId, dateStr]);
      const previousLists = queryClient.getQueriesData<HabitSession[]>({ queryKey: ["habit-sessions", habitId] });

      const optimistic: HabitSession = {
        id: previousSingle?.id ?? `optimistic-${habitId}-${dateStr}`,
        habitId,
        date: dateStr,
        sessionsCompleted,
        timeSpentMinutes,
      };

      // Set single-day cache
      queryClient.setQueryData(["habit-session", habitId, dateStr], optimistic);

      // Update any list caches for this habit
      queryClient.setQueriesData({ queryKey: ["habit-sessions", habitId] }, (old: HabitSession[] | undefined) => {
        const list = old ? [...old] : [];
        const idx = list.findIndex((s) => s.habitId === habitId && s.date === dateStr);
        if (idx !== -1) list[idx] = optimistic;
        else list.unshift(optimistic);
        return list;
      });

      return { previousSingle, previousLists } as const;
    },
    onError: (error: Error, variables, context) => {
      const { habitId, date } = variables as { habitId: string; date: Date };
      const dateStr = format(date, "yyyy-MM-dd");

      // Rollback caches
      if (context && 'previousSingle' in context) {
        // @ts-ignore
        queryClient.setQueryData(["habit-session", habitId, dateStr], context.previousSingle);
        // @ts-ignore
        (context.previousLists as Array<[unknown, HabitSession[] | undefined]>)?.forEach(([key, data]) => {
          // @ts-ignore
          queryClient.setQueryData(key as any, data);
        });
      }

      if (!silent) {
        toast({
          title: "Erro",
          description: `Falha ao salvar progresso: ${error.message}`,
          variant: "destructive",
        });
      }
    },
    onSuccess: (data, variables) => {
      const { habitId, date } = variables as { habitId: string; date: Date };
      const dateStr = format(date, "yyyy-MM-dd");

      // Confirm caches with server result
      queryClient.setQueryData(["habit-session", habitId, dateStr], data ?? null);

      queryClient.setQueriesData({ queryKey: ["habit-sessions", habitId] }, (old: HabitSession[] | undefined) => {
        const list = old ? [...old] : [];
        const idx = list.findIndex((s) => s.habitId === habitId && s.date === dateStr);
        if (!data) {
          if (idx !== -1) list.splice(idx, 1);
        } else {
          if (idx !== -1) list[idx] = data as HabitSession;
          else list.unshift(data as HabitSession);
        }
        return list;
      });

      if (!silent) {
        toast({
          title: "Progresso salvo",
          description: "Progresso do hábito foi atualizado!",
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      const { habitId, date } = variables as { habitId: string; date: Date };
      const dateStr = format(date, "yyyy-MM-dd");
      if (!silent) {
        // Soft revalidation of affected queries only when not in silent mode
        queryClient.invalidateQueries({ queryKey: ["habit-session", habitId, dateStr] });
        queryClient.invalidateQueries({ queryKey: ["habit-sessions", habitId] });
      }
    },
  });
}
