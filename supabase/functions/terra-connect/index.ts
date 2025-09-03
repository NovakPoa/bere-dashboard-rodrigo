import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already connected
    const { data: existingUser } = await supabase
      .from('terra_users')
      .select('*')
      .eq('reference_id', user.id)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Already connected',
          user: existingUser
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Terra API credentials
    const terraDevId = Deno.env.get('TERRA_DEV_ID');
    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    
    if (!terraDevId || !terraApiKey) {
      return new Response(
        JSON.stringify({ error: 'Terra credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate auth URLs for success and failure
    let defaultBaseUrl = 'https://dbc39bac-7c1b-429f-b0a3-79d695bcd6c5.sandbox.lovable.dev';
    let bodyOrigin: string | undefined;
    try {
      const body = await req.json();
      if (body?.origin) bodyOrigin = body.origin;
    } catch (_) {
      // no JSON body provided
    }
    const headerOrigin = req.headers.get('origin') || undefined;
    const baseUrl = bodyOrigin || headerOrigin || defaultBaseUrl;
    const successUrl = `${baseUrl}/atividades?terra_connected=true`;
    const errorUrl = `${baseUrl}/atividades?terra_error=true`;

    // Generate webhook URL for Terra API callbacks
    const webhookUrl = `${supabaseUrl}/functions/v1/terra-webhook`;

    console.log('🔗 Terra API request details:', {
      user_id: user.id,
      baseUrl,
      successUrl,
      errorUrl,
      webhookUrl,
      terraDevId: terraDevId ? '***configured***' : 'missing',
      terraApiKey: terraApiKey ? '***configured***' : 'missing'
    });

    try {
      // Call Terra API to generate widget session
      const terraResponse = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          language: 'en',
          auth_success_redirect_url: successUrl,
          auth_failure_redirect_url: errorUrl,
          webhook_url: webhookUrl
        }),
      });

      if (!terraResponse.ok) {
        let details: unknown;
        try {
          details = await terraResponse.json();
        } catch (_) {
          details = await terraResponse.text();
        }
        console.error('Terra API error:', terraResponse.status, details);
        return new Response(
          JSON.stringify({ error: 'Failed to generate Terra auth URL', details, status: terraResponse.status }),
          { status: terraResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const terraData = await terraResponse.json();
      const authUrl = terraData.url;

      console.log('Generated Terra auth URL for user:', user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          auth_url: authUrl,
          user_id: user.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('Error calling Terra API:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to Terra API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Terra connect error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});