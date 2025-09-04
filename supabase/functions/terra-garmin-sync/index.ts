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

    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    if (!terraApiKey) {
      throw new Error('Terra API key não configurada');
    }

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
        console.log(`🔄 Processando payload ${payload.payload_id} para usuário Terra ${payload.user_id}`);

        // 1. Mapear user_id da Terra para nosso reference_id
        const { data: terraUser, error: userError } = await supabase
          .from('terra_users')
          .select('reference_id')
          .eq('user_id', payload.user_id)
          .single();

        if (userError || !terraUser) {
          console.error('❌ Usuário Terra não encontrado:', userError);
          processedCount.errors++;
          continue;
        }

        const supabaseUserId = terraUser.reference_id;
        console.log(`👤 Mapeado Terra user ${payload.user_id} -> Supabase user ${supabaseUserId}`);

        // 2. Buscar dados detalhados da atividade na Terra API
        const terraUrl = `https://api.tryterra.co/v2/activity/${payload.user_id}?payload_id=${payload.payload_id}`;
        console.log(`🌍 Buscando dados da Terra API: ${terraUrl}`);

        const terraResponse = await fetch(terraUrl, {
          headers: {
            'X-API-Key': terraApiKey,
            'Accept': 'application/json'
          }
        });

        if (!terraResponse.ok) {
          console.error(`❌ Erro na Terra API: ${terraResponse.status} - ${terraResponse.statusText}`);
          processedCount.errors++;
          continue;
        }

        const terraData = await terraResponse.json();
        console.log('📦 Dados recebidos da Terra API:', JSON.stringify(terraData, null, 2));

        // 3. Extrair dados da atividade do response da Terra
        const activity = terraData.data?.[0]; // Primeira atividade no array
        if (!activity) {
          console.error('❌ Nenhuma atividade encontrada no payload da Terra');
          processedCount.errors++;
          continue;
        }

        // 4. Processar dados reais da atividade
        const activityData: TerraActivityData = {
          activity_type: activity.sport || activity.movement || 'unknown',
          start_time: activity.start_time || payload.start_time,
          end_time: activity.end_time || payload.end_time,
          duration_seconds: activity.duration_seconds || null,
          distance_metres: activity.distance_metres || null,
          calories_burned: activity.calories_total || activity.calories_active || null
        };

        console.log('🏃 Dados da atividade extraídos:', activityData);

        // 5. Converter para estrutura garmin_activities
        const garminActivity = {
          user_id: supabaseUserId,
          terra_user_id: payload.user_id,
          terra_payload_id: payload.payload_id,
          provider: 'garmin',
          external_id: activity.activity_uuid || activity.external_id || null,
          activity_type: mapActivityType(activityData.activity_type),
          start_time: activityData.start_time || new Date().toISOString(),
          end_time: activityData.end_time || null,
          duration_sec: activityData.duration_seconds || null,
          distance_km: activityData.distance_metres ? Number((activityData.distance_metres / 1000).toFixed(2)) : null,
          calories: activityData.calories_burned || null,
          steps: activity.steps || null,
          avg_hr: activity.heart_rate?.summary?.avg_hr || null,
          max_hr: activity.heart_rate?.summary?.max_hr || null,
          elevation_gain_m: activity.elevation?.summary?.elevation_gain || null,
          elevation_loss_m: activity.elevation?.summary?.elevation_loss || null,
          pace_min_per_km: activityData.distance_metres && activityData.duration_seconds ? 
            Number(((activityData.duration_seconds / 60) / (activityData.distance_metres / 1000)).toFixed(2)) : null,
          raw: terraData, // Guardar payload bruto para auditoria
        };

        console.log('💾 Inserindo atividade Garmin:', garminActivity);

        // 6. Inserir na tabela garmin_activities
        const { error: insertError } = await supabase
          .from('garmin_activities')
          .insert(garminActivity);

        if (insertError) {
          console.error('❌ Erro ao inserir atividade:', insertError);
          processedCount.errors++;
        } else {
          console.log(`✅ Atividade Garmin processada: ${garminActivity.activity_type} - ${garminActivity.duration_sec ? Math.round(garminActivity.duration_sec / 60) : 0}min`);
          processedCount.success++;
        }

        // 7. Remover payload processado
        const { error: deleteError } = await supabase
          .from('terra_data_payloads')
          .delete()
          .match({ 
            user_id: payload.user_id, 
            payload_id: payload.payload_id 
          });

        if (deleteError) {
          console.error('⚠️ Erro ao remover payload processado:', deleteError);
        } else {
          console.log(`🗑️ Payload ${payload.payload_id} removido`);
        }

      } catch (error) {
        console.error('❌ Erro ao processar payload:', error);
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
    // Corrida e caminhada
    'running': 'corrida',
    'trail_running': 'corrida',
    'treadmill_running': 'corrida',
    'walking': 'caminhada',
    'hiking': 'caminhada',
    'treadmill_walking': 'caminhada',
    
    // Ciclismo
    'cycling': 'ciclismo',
    'road_biking': 'ciclismo',
    'mountain_biking': 'ciclismo',
    'indoor_cycling': 'ciclismo',
    'spinning': 'ciclismo',
    
    // Natação
    'swimming': 'natacao',
    'pool_swimming': 'natacao',
    'open_water_swimming': 'natacao',
    
    // Academia e força
    'gym': 'musculacao',
    'strength_training': 'musculacao',
    'weight_training': 'musculacao',
    'bodybuilding': 'musculacao',
    'functional_training': 'musculacao',
    
    // Flexibilidade e relaxamento
    'yoga': 'yoga',
    'pilates': 'pilates',
    'stretching': 'alongamento',
    'meditation': 'meditacao',
    
    // Esportes
    'football': 'futebol',
    'soccer': 'futebol',
    'basketball': 'basquete',
    'tennis': 'tenis',
    'volleyball': 'volei',
    'paddle': 'padel',
    
    // Outros
    'cardio': 'cardio',
    'elliptical': 'cardio',
    'rowing': 'remo',
    'unknown': 'outro'
  };

  const normalizedType = terraType?.toLowerCase().replace(/[_\s]+/g, '_') || '';
  return activityMap[normalizedType] || 'outro';
}