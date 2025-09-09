import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useFoodEntries } from "./useNutrition";
import { useProfile, calculateBMR } from "./useProfile";
import { useQuery } from "@tanstack/react-query";
import { fetchActivitiesFromSupabase, totalCalories, estimateCalories } from "@/lib/fitness";

export interface DailyHealthData {
  date: string;
  consumedCalories: number;
  burnedCalories: number;
  exerciseCalories: number;
  bmrCalories: number;
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
  
  // Get profile data for BMR calculation
  const { data: profile } = useProfile();
  
  // Get fitness data
  const { data: fitnessEntries = [] } = useQuery({
    queryKey: ["fitness-activities", dateRange?.from, dateRange?.to],
    queryFn: () => fetchActivitiesFromSupabase(dateRange?.from, dateRange?.to),
  });

  // Calculate BMR once
  const bmrData = useMemo(() => {
    if (!profile) return null;
    return calculateBMR(profile);
  }, [profile]);

  const dailyData = useMemo(() => {
    // Create a map to aggregate data by date
    const dataMap = new Map<string, DailyHealthData>();
    const dailyBMR = bmrData?.bmr || 0;

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
          burnedCalories: dailyBMR,
          exerciseCalories: 0,
          bmrCalories: dailyBMR,
          balance: 0,
        });
      }
      const dayData = dataMap.get(dateKey)!;
      dayData.consumedCalories += entry.calories;
    });

    // Process fitness entries (exercise calories)
    filteredFitnessEntries.forEach(entry => {
      const dateKey = format(parseISO(entry.data), 'yyyy-MM-dd');
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: dateKey,
          consumedCalories: 0,
          burnedCalories: dailyBMR,
          exerciseCalories: 0,
          bmrCalories: dailyBMR,
          balance: 0,
        });
      }
      const dayData = dataMap.get(dateKey)!;
      const calories = entry.calorias || estimateCalories(entry);
      dayData.exerciseCalories += calories;
      dayData.burnedCalories += calories; // Add to total burned (BMR + exercise)
    });

    // Create entries for days with only BMR (no food or exercise data)
    if (dateRange && dailyBMR > 0) {
      const currentDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      
      while (currentDate <= endDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, {
            date: dateKey,
            consumedCalories: 0,
            burnedCalories: dailyBMR,
            exerciseCalories: 0,
            bmrCalories: dailyBMR,
            balance: 0,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Calculate balance and sort by date
    const result = Array.from(dataMap.values())
      .map(day => ({
        ...day,
        balance: day.consumedCalories - day.burnedCalories,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [foodEntries, fitnessEntries, dateRange, bmrData]);

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