export interface Habit {
  id: string;
  name: string;
  targetSessions: number; // Meta de sessões por dia
  targetTime: number; // Meta de tempo em minutos por dia
  createdAt: number;
}

export interface HabitSession {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  sessions: number;
  timeSpent: number; // em minutos
}

export interface DailyHabitData {
  date: string;
  sessions: number;
  timeSpent: number;
  targetSessions: number;
  targetTime: number;
}

export interface MonthlyHabitSummary {
  month: string; // YYYY-MM
  totalSessions: number;
  totalTime: number;
  averageDailySessions: number;
  averageDailyTime: number;
  daysWithActivity: number;
  targetMetPercentage: number;
}