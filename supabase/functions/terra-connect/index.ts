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

    // Parse body once for origin and optional access token
    let parsedBody: any = null;
    try {
      parsedBody = await req.json();
    } catch (_) {
      // Not a JSON request or empty body
      parsedBody = null;
    }

    // Resolve access token from Authorization header or body
    const authHeader = req.headers.get('Authorization') || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const bodyToken = parsedBody?.access_token || '';
    const accessToken = headerToken || bodyToken;

    if (!accessToken) {
      console.error('Missing access token: no Authorization header and no access_token in body');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user from provided token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

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
    
    console.log('🔑 Terra credentials check:', {
      terraDevId: terraDevId ? '***configured***' : 'missing',
      terraApiKey: terraApiKey ? '***configured***' : 'missing'
    });
    
    if (!terraDevId || !terraApiKey) {
      console.error('❌ Terra credentials missing:', { terraDevId: !!terraDevId, terraApiKey: !!terraApiKey });
      return new Response(
        JSON.stringify({ 
          error: 'Terra credentials not configured',
          details: `Missing: ${!terraDevId ? 'TERRA_DEV_ID ' : ''}${!terraApiKey ? 'TERRA_API_KEY' : ''}`.trim()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate auth URLs for success and failure
    const defaultBaseUrl = 'https://dbc39bac-7c1b-429f-b0a3-79d695bcd6c5.sandbox.lovable.dev';
    const headerOrigin = req.headers.get('origin') || undefined;
    const bodyOrigin: string | undefined = parsedBody?.origin;
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
      // Call Terra API to generate widget session - using simplified payload
      console.log('🌍 Calling Terra API with simplified payload for user:', user.id);
      const terraResponse = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          language: 'pt',
          resource: 'GARMIN',
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
        console.error('❌ Terra API error:', {
          status: terraResponse.status,
          statusText: terraResponse.statusText,
          details,
          headers: Object.fromEntries(terraResponse.headers.entries())
        });
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate Terra auth URL', 
            details: details,
            status: terraResponse.status 
          }),
          { status: terraResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const terraData = await terraResponse.json();
      const authUrl = terraData.url;

      console.log('✅ Terra API success:', {
        user_id: user.id,
        has_auth_url: !!authUrl,
        response_keys: Object.keys(terraData)
      });

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