import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TerraWebhookPayload {
  type: string;
  user?: {
    user_id: string;
    provider: string;
    reference_id?: string;
    scopes?: string;
  };
  status?: string;
  widget_session_id?: string;
  data?: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔗 Terra webhook called with method:', req.method);

    // Parse webhook payload
    const payload: TerraWebhookPayload = await req.json();
    console.log('📨 Terra webhook payload:', JSON.stringify(payload, null, 2));

    // Handle different webhook types
    switch (payload.type) {
      case 'auth':
        return await handleAuthWebhook(supabase, payload);
      case 'activity':
      case 'body':
      case 'daily':
      case 'sleep':
      case 'nutrition':
        return await handleDataWebhook(supabase, payload);
      default:
        console.log('⚠️ Unknown webhook type:', payload.type);
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook received but not processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Terra webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAuthWebhook(supabase: any, payload: TerraWebhookPayload) {
  try {
    if (!payload.user) {
      console.error('❌ Auth webhook missing user data');
      return new Response(
        JSON.stringify({ error: 'Missing user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, provider, reference_id, scopes } = payload.user;
    
    console.log(`✅ Processing auth for user: ${user_id}, provider: ${provider}, reference: ${reference_id}`);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('terra_users')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (existingUser) {
      console.log('👤 User already exists, updating scopes');
      const { error: updateError } = await supabase
        .from('terra_users')
        .update({
          granted_scopes: scopes || null,
          state: payload.status || 'connected'
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('❌ Error updating existing user:', updateError);
        throw updateError;
      }
    } else {
      console.log('👤 Creating new Terra user');
      const { error: insertError } = await supabase
        .from('terra_users')
        .insert({
          user_id,
          provider,
          reference_id: reference_id || null,
          granted_scopes: scopes || null,
          state: payload.status || 'connected',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error inserting new user:', insertError);
        throw insertError;
      }
    }

    console.log('✅ Auth webhook processed successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Auth processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Auth webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process auth webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDataWebhook(supabase: any, payload: TerraWebhookPayload) {
  try {
    console.log(`📊 Processing ${payload.type} data webhook`);

    // Store data payload for later processing by sync function
    if (payload.data && payload.data.length > 0) {
      for (const dataItem of payload.data) {
        const payloadId =
          dataItem?.payload_id ||
          dataItem?.payloadId ||
          dataItem?.id ||
          dataItem?.uuid ||
          dataItem?.metadata?.id ||
          dataItem?.meta?.id ||
          `${payload.type}_${Date.now()}_${Math.random()}`;

        const user_id = payload.user?.user_id || dataItem?.user_id || dataItem?.userId || 'unknown';
        const start_time = dataItem?.start_time || dataItem?.startDate || dataItem?.start || null;
        const end_time = dataItem?.end_time || dataItem?.endDate || dataItem?.end || null;

        const { error } = await supabase
          .from('terra_data_payloads')
          .insert({
            payload_id: payloadId,
            user_id,
            data_type: payload.type,
            start_time,
            end_time,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Error storing data payload:', error);
        } else {
          console.log(`✅ Stored data payload ${payloadId} for processing`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Data webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Data webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process data webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}