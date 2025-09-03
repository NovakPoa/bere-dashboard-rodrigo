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

    // Generate Terra API auth URL
    // Note: In a real implementation, you would call Terra API to get the auth URL
    // For now, we'll return a placeholder URL
    const authUrl = `https://api.tryterra.co/v2/auth?resource=GARMIN&auth_success_redirect_url=${encodeURIComponent('https://your-app.com/terra-success')}&auth_failure_redirect_url=${encodeURIComponent('https://your-app.com/terra-error')}&user_id=${user.id}`;

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
    console.error('Terra connect error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});