import { supabase } from "@/integrations/supabase/client";

export interface GarminActivity {
  id: string;
  user_id: string;
  terra_user_id: string;
  terra_payload_id: string;
  provider: string;
  external_id?: string;
  activity_type: string;
  start_time: string;
  end_time?: string;
  duration_sec?: number;
  distance_km?: number;
  calories?: number;
  steps?: number;
  avg_hr?: number;
  max_hr?: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  pace_min_per_km?: number;
  raw?: any;
  created_at: string;
  updated_at: string;
}

export async function fetchGarminActivities(from?: Date, to?: Date): Promise<GarminActivity[]> {
  let query = supabase
    .from('garmin_activities')
    .select('*')
    .order('start_time', { ascending: false });

  if (from) {
    query = query.gte('start_time', from.toISOString());
  }

  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('start_time', endOfDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching Garmin activities:', error);
    throw error;
  }

  return data || [];
}

export function mapActivityType(terraType?: string): string {
  if (!terraType) return 'outro';
  
  const type = terraType.toLowerCase();
  
  if (type.includes('run')) return 'corrida';
  if (type.includes('bike') || type.includes('cycling')) return 'ciclismo';
  if (type.includes('swim')) return 'natacao';
  if (type.includes('walk')) return 'caminhada';
  if (type.includes('strength') || type.includes('weight')) return 'musculacao';
  if (type.includes('yoga')) return 'yoga';
  if (type.includes('hike')) return 'trilha';
  
  return 'outro';
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatPace(distanceKm?: number, durationSec?: number): string {
  if (!distanceKm || !durationSec || distanceKm === 0) return '--';
  
  const paceMinPerKm = durationSec / 60 / distanceKm;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}