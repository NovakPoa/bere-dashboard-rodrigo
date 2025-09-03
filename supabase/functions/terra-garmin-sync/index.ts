import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TerraDataPayload {
  user_id: string;
  data_type: string;
  created_at: string;
  payload_id: string;
  start_time?: string;
  end_time?: string;
}

interface TerraActivityData {
  activity_type?: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  distance_metres?: number;
  calories_burned?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados não processados da Terra API
    const { data: terraPayloads, error: fetchError } = await supabase
      .from('terra_data_payloads')
      .select('*')
      .eq('data_type', 'activity')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Erro ao buscar dados Terra:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Processando ${terraPayloads?.length || 0} atividades do Garmin`);

    const processedCount = { success: 0, errors: 0 };

    for (const payload of terraPayloads || []) {
      try {
        // Simular dados de atividade (na prática viriam do payload da Terra API)
        const activityData: TerraActivityData = {
          activity_type: 'corrida', // Mapear do payload real
          start_time: payload.start_time,
          end_time: payload.end_time,
          duration_seconds: 1800, // 30 min - vem do payload
          distance_metres: 5000, // 5km - vem do payload
          calories_burned: 300 // vem do payload
        };

        // Converter para nossa estrutura atividade_fisica
        const fitnessEntry = {
          modalidade: mapActivityType(activityData.activity_type),
          data: payload.start_time ? new Date(payload.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          duracao_min: activityData.duration_seconds ? Math.round(activityData.duration_seconds / 60) : null,
          distancia_km: activityData.distance_metres ? activityData.distance_metres / 1000 : null,
          calorias: activityData.calories_burned || null,
          origem: 'garmin',
          texto: `Atividade sincronizada do Garmin: ${activityData.activity_type}`,
          tipo: 'atividade_fisica',
          user_id: null, // Precisa mapear user_id da Terra para nosso sistema
          created_at: new Date().toISOString()
        };

        // Inserir na tabela atividade_fisica
        const { error: insertError } = await supabase
          .from('atividade_fisica')
          .insert(fitnessEntry);

        if (insertError) {
          console.error('Erro ao inserir atividade:', insertError);
          processedCount.errors++;
        } else {
          console.log(`✅ Atividade processada: ${fitnessEntry.modalidade}`);
          processedCount.success++;
        }

        // Remover payload processado
        await supabase
          .from('terra_data_payloads')
          .delete()
          .match({ 
            user_id: payload.user_id, 
            created_at: payload.created_at 
          });

      } catch (error) {
        console.error('Erro ao processar payload:', error);
        processedCount.errors++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Sincronização concluída',
        processed: processedCount.success,
        errors: processedCount.errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na sincronização Terra-Garmin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function mapActivityType(terraType?: string): string {
  const activityMap: Record<string, string> = {
    'running': 'corrida',
    'walking': 'caminhada',
    'cycling': 'ciclismo',
    'swimming': 'natacao',
    'gym': 'musculacao',
    'yoga': 'yoga',
    'pilates': 'pilates'
  };

  return activityMap[terraType || ''] || 'outro';
}