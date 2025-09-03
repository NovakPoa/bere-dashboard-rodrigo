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
    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    if (!terraApiKey) {
      return new Response(
        JSON.stringify({ error: 'Terra API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate auth URLs for success and failure
    const baseUrl = req.headers.get('origin') || 'https://dbc39bac-7c1b-429f-b0a3-79d695bcd6c5.sandbox.lovable.dev';
    const successUrl = `${baseUrl}/atividades?terra_connected=true`;
    const errorUrl = `${baseUrl}/atividades?terra_error=true`;

    try {
      // Call Terra API to generate auth URL
      const terraResponse = await fetch('https://api.tryterra.co/v2/auth/generateAuthURL', {
        method: 'POST',
        headers: {
          'dev-id': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource: 'GARMIN',
          auth_success_redirect_url: successUrl,
          auth_failure_redirect_url: errorUrl,
          reference_id: user.id
        }),
      });

      if (!terraResponse.ok) {
        console.error('Terra API error:', await terraResponse.text());
        return new Response(
          JSON.stringify({ error: 'Failed to generate Terra auth URL' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const terraData = await terraResponse.json();
      const authUrl = terraData.auth_url;

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