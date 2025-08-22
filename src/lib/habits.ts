import { Habit, HabitSession, DailyHabitData, MonthlyHabitSummary } from "@/types/habit";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";

const HABITS_KEY = "habits_v2";
const SESSIONS_KEY = "habit_sessions_v2";

export function getHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function getSessions(): HabitSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: HabitSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function addHabit(name: string, targetSessions: number, targetTime: number): Habit {
  const habits = getHabits();
  const newHabit: Habit = {
    id: `habit-${Date.now()}`,
    name,
    targetSessions,
    targetTime,
    createdAt: Date.now(),
  };
  
  const updatedHabits = [...habits, newHabit];
  saveHabits(updatedHabits);
  return newHabit;
}

export function updateHabitSession(habitId: string, date: string, sessions: number, timeSpent: number): void {
  const allSessions = getSessions();
  const sessionIndex = allSessions.findIndex(s => s.habitId === habitId && s.date === date);
  
  if (sessionIndex >= 0) {
    if (sessions === 0 && timeSpent === 0) {
      // Remove session if both are 0
      allSessions.splice(sessionIndex, 1);
    } else {
      // Update existing session
      allSessions[sessionIndex] = {
        ...allSessions[sessionIndex],
        sessions,
        timeSpent,
      };
    }
  } else if (sessions > 0 || timeSpent > 0) {
    // Add new session
    allSessions.push({
      id: `session-${Date.now()}`,
      habitId,
      date,
      sessions,
      timeSpent,
    });
  }
  
  saveSessions(allSessions);
}

export function getHabitSessionForDate(habitId: string, date: string): HabitSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.habitId === habitId && s.date === date) || null;
}

export function getDailyHabitData(habitId: string, year: number, month: number): DailyHabitData[] {
  const habit = getHabits().find(h => h.id === habitId);
  if (!habit) return [];
  
  const sessions = getSessions().filter(s => s.habitId === habitId);
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const session = sessions.find(s => s.date === dateStr);
    
    return {
      date: dateStr,
      sessions: session?.sessions || 0,
      timeSpent: session?.timeSpent || 0,
      targetSessions: habit.targetSessions,
      targetTime: habit.targetTime,
    };
  });
}

export function getMonthlyHabitSummaries(habitId: string): MonthlyHabitSummary[] {
  const sessions = getSessions().filter(s => s.habitId === habitId);
  const habit = getHabits().find(h => h.id === habitId);
  
  if (!habit || sessions.length === 0) return [];
  
  // Group sessions by month
  const monthlyData: Record<string, HabitSession[]> = {};
  
  sessions.forEach(session => {
    const month = session.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(session);
  });
  
  return Object.entries(monthlyData)
    .map(([month, monthSessions]) => {
      const totalSessions = monthSessions.reduce((sum, s) => sum + s.sessions, 0);
      const totalTime = monthSessions.reduce((sum, s) => sum + s.timeSpent, 0);
      const daysWithActivity = monthSessions.length;
      
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = endOfMonth(new Date(year, monthNum - 1)).getDate();
      
      const expectedTotalSessions = daysInMonth * habit.targetSessions;
      const expectedTotalTime = daysInMonth * habit.targetTime;
      
      const sessionMetPercentage = expectedTotalSessions > 0 ? (totalSessions / expectedTotalSessions) * 100 : 0;
      const timeMetPercentage = expectedTotalTime > 0 ? (totalTime / expectedTotalTime) * 100 : 0;
      const targetMetPercentage = (sessionMetPercentage + timeMetPercentage) / 2;
      
      return {
        month,
        totalSessions,
        totalTime,
        averageDailySessions: totalSessions / daysInMonth,
        averageDailyTime: totalTime / daysInMonth,
        daysWithActivity,
        targetMetPercentage,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first
}

export function deleteHabit(habitId: string): void {
  const habits = getHabits().filter(h => h.id !== habitId);
  const sessions = getSessions().filter(s => s.habitId !== habitId);
  
  saveHabits(habits);
  saveSessions(sessions);
}