import { addDays, isAfter, startOfDay, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type FitnessEntry = {
  tipo: string;
  minutos: number;
  distanciaKm?: number;
  nota?: string;
  data: string; // ISO
};

const STORAGE_KEY = "fitness_activities_v1";

export function getActivities(): FitnessEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as FitnessEntry[];
  } catch {
    return [];
  }
}

export function addActivity(entry: FitnessEntry) {
  const all = getActivities();
  all.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return entry;
}

export function lastNDays(entries: FitnessEntry[], days = 7, ref = new Date()) {
  const from = startOfDay(subDays(ref, days - 1));
  return entries.filter((e) => new Date(e.data) >= from);
}

export function groupTotalsByModality(entries: FitnessEntry[]) {
  const map: Record<string, { minutos: number; distanciaKm: number }> = {};
  for (const e of entries) {
    const key = e.tipo?.toLowerCase() || "atividade";
    map[key] = map[key] || { minutos: 0, distanciaKm: 0 };
    map[key].minutos += e.minutos || 0;
    map[key].distanciaKm += e.distanciaKm || 0;
  }
  return map;
}

const CAL_PER_MIN: Record<string, number> = {
  corrida: 10,
  running: 10,
  natação: 8,
  natacao: 8,
  swim: 8,
  bike: 7,
  ciclismo: 7,
  caminhada: 4,
  walking: 4,
  musculação: 6,
  musculacao: 6,
  "jiu-jitsu": 10,
  jiujitsu: 10,
  bjj: 10,
};

export function estimateCalories(e: FitnessEntry) {
  const tipo = (e.tipo || "").toLowerCase();
  const key = Object.keys(CAL_PER_MIN).find((k) => tipo.includes(k));
  const perMin = key ? CAL_PER_MIN[key] : 6;
  return (e.minutos || 0) * perMin;
}

export function totalCalories(entries: FitnessEntry[]) {
  return entries.reduce((sum, e) => sum + estimateCalories(e), 0);
}

export function dailySeriesMinutes(entries: FitnessEntry[]) {
  // build last 7 days buckets
  const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const labels = days.map((d) => d.toISOString().slice(5, 10)); // MM-DD

  // modalities present
  const modalities = Array.from(new Set(entries.map((e) => e.tipo?.toLowerCase() || "atividade")));

  const data = labels.map((label, idx) => {
    const day = days[idx];
    const next = addDays(day, 1);
    const slice = entries.filter((e) => new Date(e.data) >= day && new Date(e.data) < next);
    const row: any = { dia: label };
    for (const m of modalities) row[m] = 0;
    for (const e of slice) {
      const k = e.tipo?.toLowerCase() || "atividade";
      row[k] += e.minutos || 0;
    }
    return row;
  });

  return { data, modalities } as { data: Array<Record<string, number | string>>; modalities: string[] };
}

// Supabase integration
export type DbActivityRow = {
  modalidade?: string | null;
  distancia_km?: number | string | null;
  duracao_min?: number | string | null;
  calorias?: number | string | null;
  data?: string | null;
  ts?: string | null;
  tipo?: string | null;
};

const toNum = (v: unknown | null | undefined): number | undefined =>
  v === null || v === undefined || v === "" ? undefined : Number(v);

export function mapDbRowToFitnessEntry(r: DbActivityRow): FitnessEntry {
  const minutos = Number(r.duracao_min ?? 0);
  const distanciaKm = toNum(r.distancia_km);
  const d = r.ts || r.data || new Date().toISOString();
  return {
    tipo: (r.modalidade || r.tipo || "atividade")!,
    minutos,
    distanciaKm,
    data: new Date(d).toISOString(),
  };
}

export async function fetchActivitiesFromSupabase(from?: Date, to?: Date): Promise<FitnessEntry[]> {
  let query = supabase
    .from("bereproject")
    .select("modalidade, distancia_km, duracao_min, calorias, data, ts, tipo")
    .order("ts", { ascending: false });

  if (from && to) {
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    query = query.gte("data", fromStr).lte("data", toStr);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as DbActivityRow[]).map(mapDbRowToFitnessEntry);
}
