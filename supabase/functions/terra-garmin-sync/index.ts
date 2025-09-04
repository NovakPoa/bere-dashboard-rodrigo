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
    const terraDevId = Deno.env.get('TERRA_DEV_ID');
    
    if (!terraApiKey || !terraDevId) {
      throw new Error('Terra API key ou Dev ID não configurados');
    }

    // Obter usuário autenticado (se houver) para possível backfill
    const supabaseUrlLocal = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authClient = createClient(supabaseUrlLocal, supabaseAnonKey, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user: authUser } } = await authClient.auth.getUser();
    const currentUserId = authUser?.id || null;

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
        let terraUrl = `https://api.tryterra.co/v2/activity?user_id=${payload.user_id}&payload_id=${payload.payload_id}&to_webhook=false`;
        console.log(`🌍 Buscando dados da Terra API: ${terraUrl}`);

        let terraResponse = await fetch(terraUrl, {
          headers: {
            'dev-id': terraDevId,
            'x-api-key': terraApiKey,
            'Accept': 'application/json'
          }
        });

        // Se não encontrado por payload_id, tentar fallback por janela de tempo
        if (!terraResponse.ok && payload.start_time && payload.end_time) {
          const fallbackUrl = `https://api.tryterra.co/v2/activity?user_id=${payload.user_id}&start_date=${encodeURIComponent(payload.start_time)}&end_date=${encodeURIComponent(payload.end_time)}&to_webhook=false`;
          console.warn(`⚠️ Payload não encontrado. Tentando fallback por janela de tempo: ${fallbackUrl}`);
          terraResponse = await fetch(fallbackUrl, {
            headers: {
              'dev-id': terraDevId,
              'x-api-key': terraApiKey,
              'Accept': 'application/json'
            }
          });
        }

        if (!terraResponse.ok) {
          const errorBody = await terraResponse.text();
          console.error(`❌ Erro na Terra API: ${terraResponse.status} - ${terraResponse.statusText}`);
          console.error(`❌ Terra API Error Body:`, errorBody);
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
          activity_type: activity.metadata?.name || activity.metadata?.type?.toString() || 'unknown',
          start_time: activity.metadata?.start_time || payload.start_time,
          end_time: activity.metadata?.end_time || payload.end_time,
          duration_seconds: activity.active_durations_data?.activity_seconds || null,
          distance_metres: activity.distance_data?.summary?.distance_meters || null,
          calories_burned: activity.calories_data?.total_burned_calories || null
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
          duration_sec: activityData.duration_seconds || 
            (activityData.start_time && activityData.end_time ? 
              Math.round((new Date(activityData.end_time).getTime() - new Date(activityData.start_time).getTime()) / 1000) : null),
          distance_km: activityData.distance_metres ? Number((activityData.distance_metres / 1000).toFixed(2)) : null,
          calories: activityData.calories_burned || null,
          steps: activity.distance_data?.summary?.steps || null,
          avg_hr: activity.heart_rate_data?.summary?.avg_hr_bpm || null,
          max_hr: activity.heart_rate_data?.summary?.max_hr_bpm || null,
          elevation_gain_m: activity.distance_data?.summary?.elevation?.gain_actual_meters || null,
          elevation_loss_m: activity.distance_data?.summary?.elevation?.loss_actual_meters || null,
          pace_min_per_km: activityData.distance_metres && activityData.duration_seconds ? 
            Number(((activityData.duration_seconds / 60) / (activityData.distance_metres / 1000)).toFixed(2)) : null,
          raw: terraData, // Guardar payload bruto para auditoria
        };

        // 6. Inserir/atualizar na tabela garmin_activities (idempotente)
        const { error: upsertError } = await supabase
          .from('garmin_activities')
          .upsert(garminActivity, { onConflict: 'terra_payload_id', ignoreDuplicates: true });

        if (upsertError) {
          console.error('❌ Erro ao inserir/atualizar atividade:', upsertError);
          processedCount.errors++;
        } else {
          console.log(`✅ Atividade Garmin registrada: ${garminActivity.activity_type} - ${garminActivity.duration_sec ? Math.round(garminActivity.duration_sec / 60) : 0}min`);
          processedCount.success++;
          
          // 7. Remover payload processado (sempre que o upsert não falhar)
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
        }

      } catch (error) {
        console.error('❌ Erro ao processar payload:', error);
        processedCount.errors++;
      }
    }

    // Backfill: se não houver payloads, tentar buscar últimas 30 dias para o usuário atual
    if ((terraPayloads?.length || 0) === 0 && currentUserId) {
      try {
        const { data: terraUserForCurrent } = await supabase
          .from('terra_users')
          .select('user_id')
          .eq('reference_id', currentUserId)
          .single();

        if (terraUserForCurrent?.user_id) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 30);
          const backfillUrl = `https://api.tryterra.co/v2/activity?user_id=${terraUserForCurrent.user_id}&start_date=${encodeURIComponent(start.toISOString())}&end_date=${encodeURIComponent(end.toISOString())}&to_webhook=false`;
          console.log(`🕰️ Backfill (30d): ${backfillUrl}`);
          const resp = await fetch(backfillUrl, {
            headers: { 'dev-id': terraDevId!, 'x-api-key': terraApiKey!, 'Accept': 'application/json' }
          });
          if (resp.ok) {
            const json = await resp.json();
            const activities = json.data || [];
            console.log(`📦 Backfill retornou ${activities.length} atividades`);
            for (const activity of activities) {
              const activityData = {
                activity_type: activity.metadata?.name || activity.metadata?.type?.toString() || 'unknown',
                start_time: activity.metadata?.start_time,
                end_time: activity.metadata?.end_time,
                duration_seconds: activity.active_durations_data?.activity_seconds || null,
                distance_metres: activity.distance_data?.summary?.distance_meters || null,
                calories_burned: activity.calories_data?.total_burned_calories || null,
              };

              const terraPayloadId = activity.payload_id || activity.payloadId || activity.activity_uuid || `bf_${terraUserForCurrent.user_id}_${activity.start_time}`;

              const garminActivity = {
                user_id: currentUserId,
                terra_user_id: terraUserForCurrent.user_id,
                terra_payload_id: String(terraPayloadId),
                provider: 'garmin',
                external_id: activity.activity_uuid || activity.external_id || null,
                activity_type: mapActivityType(activityData.activity_type),
                start_time: activityData.start_time || new Date().toISOString(),
                end_time: activityData.end_time || null,
                duration_sec: activityData.duration_seconds || (activityData.start_time && activityData.end_time ? Math.round((new Date(activityData.end_time).getTime() - new Date(activityData.start_time).getTime()) / 1000) : null),
                distance_km: activityData.distance_metres ? Number((activityData.distance_metres / 1000).toFixed(2)) : null,
                calories: activityData.calories_burned || null,
                steps: activity.distance_data?.summary?.steps || null,
                avg_hr: activity.heart_rate_data?.summary?.avg_hr_bpm || null,
                max_hr: activity.heart_rate_data?.summary?.max_hr_bpm || null,
                elevation_gain_m: activity.distance_data?.summary?.elevation?.gain_actual_meters || null,
                elevation_loss_m: activity.distance_data?.summary?.elevation?.loss_actual_meters || null,
                pace_min_per_km: activityData.distance_metres && activityData.duration_seconds ? Number(((activityData.duration_seconds / 60) / (activityData.distance_metres / 1000)).toFixed(2)) : null,
                raw: activity,
              };

              const { error: upsertErr } = await supabase
                .from('garmin_activities')
                .upsert(garminActivity, { onConflict: 'terra_payload_id', ignoreDuplicates: true });
              if (upsertErr) {
                console.error('❌ Erro ao upsert backfill:', upsertErr);
                processedCount.errors++;
              } else {
                processedCount.success++;
              }
            }
          } else {
            console.warn('⚠️ Backfill Terra API falhou', await resp.text());
          }
        } else {
          console.log('ℹ️ Backfill ignorado: nenhum Terra user para o usuário atual');
        }
      } catch (bfErr) {
        console.error('❌ Erro no backfill:', bfErr);
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
  if (!terraType) return 'outro';
  
  // Mapear por nome da atividade (metadata.name)
  const nameMap: Record<string, string> = {
    'bicicleta': 'ciclismo',
    'bike': 'ciclismo',
    'cycling': 'ciclismo',
    'corrida': 'corrida',
    'running': 'corrida',
    'caminhada': 'caminhada',
    'walking': 'caminhada',
    'natação': 'natacao',
    'swimming': 'natacao',
    'musculação': 'musculacao',
    'strength': 'musculacao',
    'yoga': 'yoga',
    'trilha': 'trilha',
    'hiking': 'trilha'
  };
  
  // Mapear por tipo Garmin (metadata.type)
  const typeMap: Record<string, string> = {
    '1': 'ciclismo',     // Garmin cycling
    '133': 'corrida',    // Garmin running
    '4': 'natacao',      // Garmin swimming
    '8': 'caminhada',    // Garmin walking
    '15': 'trilha',      // Garmin hiking
    '17': 'musculacao'   // Garmin strength training
  };
  
  const lowerType = terraType.toLowerCase();
  
  // Tentar mapear por nome primeiro
  for (const [key, value] of Object.entries(nameMap)) {
    if (lowerType.includes(key)) {
      return value;
    }
  }
  
  // Tentar mapear por tipo numérico
  if (typeMap[terraType]) {
    return typeMap[terraType];
  }
  
  // Fallback para padrões conhecidos
  if (lowerType.includes('run')) return 'corrida';
  if (lowerType.includes('bike') || lowerType.includes('cycl')) return 'ciclismo';
  if (lowerType.includes('swim')) return 'natacao';
  if (lowerType.includes('walk')) return 'caminhada';
  if (lowerType.includes('strength') || lowerType.includes('weight')) return 'musculacao';
  if (lowerType.includes('yoga')) return 'yoga';
  if (lowerType.includes('hike') || lowerType.includes('trail')) return 'trilha';
  
  return 'outro';
}