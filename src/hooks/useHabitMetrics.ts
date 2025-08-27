import { useMemo } from "react";
import { useHabitSessions } from "./useHabitSessions";
import { HabitDefinition } from "./useHabitDefinitions";
import { differenceInDays, startOfDay } from "date-fns";

export interface HabitMetrics {
  totalSessions: number;
  averageDailySessions: number;
  totalTimeMinutes: number;
  averageDailyTimeMinutes: number;
  daysInPeriod: number;
  projectedSessions: number;
  projectedTimeMinutes: number;
  sessionsProgress: number;
  timeProgress: number;
}

export function useHabitMetrics(
  habit: HabitDefinition, 
  startDate: Date, 
  endDate: Date
): HabitMetrics {
  const { data: sessions = [] } = useHabitSessions(habit.id, startDate, endDate);

  return useMemo(() => {
    const daysInPeriod = differenceInDays(endDate, startDate) + 1;
    
    const totalSessions = sessions.reduce((sum, session) => sum + session.sessionsCompleted, 0);
    const totalTimeMinutes = sessions.reduce((sum, session) => sum + session.timeSpentMinutes, 0);
    
    const averageDailySessions = daysInPeriod > 0 ? totalSessions / daysInPeriod : 0;
    const averageDailyTimeMinutes = daysInPeriod > 0 ? totalTimeMinutes / daysInPeriod : 0;
    
    const projectedSessions = habit.targetSessions * daysInPeriod;
    const projectedTimeMinutes = habit.targetTimeMinutes * daysInPeriod;
    
    const sessionsProgress = projectedSessions > 0 ? (totalSessions / projectedSessions) * 100 : 0;
    const timeProgress = projectedTimeMinutes > 0 ? (totalTimeMinutes / projectedTimeMinutes) * 100 : 0;

    return {
      totalSessions,
      averageDailySessions,
      totalTimeMinutes,
      averageDailyTimeMinutes,
      daysInPeriod,
      projectedSessions,
      projectedTimeMinutes,
      sessionsProgress: Math.min(sessionsProgress, 100),
      timeProgress: Math.min(timeProgress, 100),
    };
  }, [sessions, habit, startDate, endDate]);
}