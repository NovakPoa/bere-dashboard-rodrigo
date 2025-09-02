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
    const { imageBase64, textDescription } = await req.json();

    if (!imageBase64 && !textDescription) {
      return new Response(
        JSON.stringify({ error: 'Imagem ou descrição de texto é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analisando com OpenAI...', imageBase64 ? 'imagem' : 'texto');

    let messages;
    
    if (imageBase64) {
      // Análise de imagem
      messages = [
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
      ];
    } else {
      // Análise de texto
      messages = [
        {
          role: 'system',
          content: `Você é um nutricionista especializado em análise de alimentos. Analise a descrição textual dos alimentos e retorne APENAS um JSON válido com as seguintes informações:
          {
            "description": "descrição clara dos alimentos e quantidades",
            "mealType": "café da manhã" | "almoço" | "lanche" | "jantar",
            "calories": número_estimado_de_calorias,
            "protein": gramas_de_proteína,
            "carbs": gramas_de_carboidratos,
            "fat": gramas_de_gordura
          }
          
          Interpretar corretamente quantidades brasileiras como:
          - Colheres de sopa/chá/café
          - Xícaras de chá/café
          - Pratos fundos/rasos
          - Fatias, unidades, porções
          - Copos (200ml)
          
          Baseie-se em alimentos brasileiros típicos e suas porções padrão. Use estimativas conservadoras quando houver dúvidas.`
        },
        {
          role: 'user',
          content: `Analise esta descrição de alimentos e forneça as informações nutricionais: "${textDescription}"`
        }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
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

    // Função para limpar markdown da resposta
    const cleanJsonResponse = (response: string): string => {
      // Remove markdown code blocks se presentes
      let cleaned = response.trim();
      
      // Remove ```json e ``` no início e fim
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '');
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '');
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.replace(/\s*```$/, '');
      }
      
      return cleaned.trim();
    };

    try {
      const cleanedResponse = cleanJsonResponse(aiResponse);
      console.log('Resposta limpa para parsing:', cleanedResponse);
      
      const nutritionData = JSON.parse(cleanedResponse);
      
      // Validar se tem as propriedades necessárias
      if (!nutritionData.description || typeof nutritionData.calories !== 'number') {
        throw new Error('Resposta inválida da IA');
      }

      return new Response(JSON.stringify(nutritionData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', parseError);
      console.error('Resposta original:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Não foi possível analisar a descrição. Verifique o texto e tente novamente.' }),
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