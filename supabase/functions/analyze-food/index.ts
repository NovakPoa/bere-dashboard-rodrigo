import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Imagem é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analisando imagem com OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um nutricionista especializado em análise de alimentos. Analise a imagem e retorne APENAS um JSON válido com as seguintes informações:
            {
              "description": "descrição detalhada dos alimentos identificados",
              "mealType": "café da manhã" | "almoço" | "lanche" | "jantar",
              "calories": número_estimado_de_calorias,
              "protein": gramas_de_proteína,
              "carbs": gramas_de_carboidratos,
              "fat": gramas_de_gordura
            }
            
            Seja preciso nas estimativas baseado no tamanho das porções visíveis. Se não conseguir identificar claramente, use estimativas conservadoras.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem de comida e forneça as informações nutricionais:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API OpenAI:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao analisar imagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('Resposta da OpenAI:', aiResponse);

    try {
      const nutritionData = JSON.parse(aiResponse);
      
      // Validar se tem as propriedades necessárias
      if (!nutritionData.description || typeof nutritionData.calories !== 'number') {
        throw new Error('Resposta inválida da IA');
      }

      return new Response(JSON.stringify(nutritionData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', parseError);
      return new Response(
        JSON.stringify({ error: 'Não foi possível analisar a imagem. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erro na função analyze-food:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});