import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useFoodEntries } from "./useNutrition";
import { useQuery } from "@tanstack/react-query";
import { fetchActivitiesFromSupabase, totalCalories, estimateCalories } from "@/lib/fitness";

export interface DailyHealthData {
  date: string;
  consumedCalories: number;
  burnedCalories: number;
  balance: number;
}

export interface HealthMetrics {
  avgConsumed: number;
  avgBurned: number;
  avgBalance: number;
  maxDeficit: number;
  maxSurplus: number;
  totalDays: number;
}

export function useHealthData(dateRange?: { from: Date; to: Date }) {
  // Get nutrition data
  const { data: foodEntries = [] } = useFoodEntries();
  
  // Get fitness data
  const { data: fitnessEntries = [] } = useQuery({
    queryKey: ["fitness-activities", dateRange?.from, dateRange?.to],
    queryFn: () => fetchActivitiesFromSupabase(dateRange?.from, dateRange?.to),
  });

  const dailyData = useMemo(() => {
    // Create a map to aggregate data by date
    const dataMap = new Map<string, DailyHealthData>();

    // Filter entries by date range if provided
    const filteredFoodEntries = dateRange
      ? foodEntries.filter(entry => {
          const entryDate = parseISO(entry.date);
          return entryDate >= dateRange.from && entryDate <= dateRange.to;
        })
      : foodEntries;

    const filteredFitnessEntries = dateRange
      ? fitnessEntries.filter(entry => {
          const entryDate = parseISO(entry.data);
          return entryDate >= dateRange.from && entryDate <= dateRange.to;
        })
      : fitnessEntries;

    // Process food entries (consumed calories)
    filteredFoodEntries.forEach(entry => {
      const dateKey = format(parseISO(entry.date), 'yyyy-MM-dd');
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: dateKey,
          consumedCalories: 0,
          burnedCalories: 0,
          balance: 0,
        });
      }
      const dayData = dataMap.get(dateKey)!;
      dayData.consumedCalories += entry.calories;
    });

    // Process fitness entries (burned calories)
    filteredFitnessEntries.forEach(entry => {
      const dateKey = format(parseISO(entry.data), 'yyyy-MM-dd');
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: dateKey,
          consumedCalories: 0,
          burnedCalories: 0,
          balance: 0,
        });
      }
      const dayData = dataMap.get(dateKey)!;
      const calories = entry.calorias || estimateCalories(entry);
      dayData.burnedCalories += calories;
    });

    // Calculate balance and sort by date
    const result = Array.from(dataMap.values())
      .map(day => ({
        ...day,
        balance: day.consumedCalories - day.burnedCalories,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [foodEntries, fitnessEntries, dateRange]);

  const metrics = useMemo((): HealthMetrics => {
    if (dailyData.length === 0) {
      return {
        avgConsumed: 0,
        avgBurned: 0,
        avgBalance: 0,
        maxDeficit: 0,
        maxSurplus: 0,
        totalDays: 0,
      };
    }

    const totalConsumed = dailyData.reduce((sum, day) => sum + day.consumedCalories, 0);
    const totalBurned = dailyData.reduce((sum, day) => sum + day.burnedCalories, 0);
    const totalBalance = dailyData.reduce((sum, day) => sum + day.balance, 0);
    
    const balances = dailyData.map(day => day.balance);
    const maxDeficit = Math.min(...balances, 0);
    const maxSurplus = Math.max(...balances, 0);

    return {
      avgConsumed: totalConsumed / dailyData.length,
      avgBurned: totalBurned / dailyData.length,
      avgBalance: totalBalance / dailyData.length,
      maxDeficit,
      maxSurplus,
      totalDays: dailyData.length,
    };
  }, [dailyData]);

  return {
    dailyData,
    metrics,
    isLoading: false, // Both queries are independent
  };
}