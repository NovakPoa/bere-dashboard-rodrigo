-- Migrar dados existentes da categoria "Alimentação" para "Restaurante" e "Mercado"

-- Atualizar registros que contêm palavras relacionadas a mercado/supermercado para "Mercado"
UPDATE public.financeiro 
SET categoria = 'Mercado'
WHERE categoria ILIKE '%alimentação%' 
  AND (
    texto ILIKE '%mercado%' OR 
    texto ILIKE '%supermercado%' OR 
    texto ILIKE '%feira%' OR 
    texto ILIKE '%compras%' OR 
    texto ILIKE '%padaria%' OR 
    texto ILIKE '%açougue%' OR 
    texto ILIKE '%hortifruti%' OR
    descricao ILIKE '%mercado%' OR 
    descricao ILIKE '%supermercado%' OR 
    descricao ILIKE '%feira%' OR 
    descricao ILIKE '%compras%' OR 
    descricao ILIKE '%padaria%' OR 
    descricao ILIKE '%açougue%' OR 
    descricao ILIKE '%hortifruti%'
  );

-- Atualizar registros com categoria "mercado" ou similar diretamente para "Mercado"
UPDATE public.financeiro 
SET categoria = 'Mercado'
WHERE categoria ILIKE 'mercado' OR 
      categoria ILIKE 'supermercado' OR 
      categoria ILIKE 'feira' OR
      categoria ILIKE 'compras';

-- Atualizar todos os outros registros de "Alimentação" para "Restaurante"
UPDATE public.financeiro 
SET categoria = 'Restaurante'
WHERE categoria ILIKE '%alimentação%' OR categoria ILIKE 'alimentacao';

-- Verificar se existem registros com categorias em minúsculas que precisam ser atualizados
UPDATE public.financeiro 
SET categoria = 'Restaurante'
WHERE categoria = 'restaurante' OR categoria = 'comida' OR categoria = 'refeição' OR categoria = 'refeicao';

UPDATE public.financeiro 
SET categoria = 'Mercado'
WHERE categoria = 'mercado' OR categoria = 'supermercado' OR categoria = 'compras' OR categoria = 'feira';