-- Rename columns to better reflect unit prices
ALTER TABLE investments 
RENAME COLUMN valor_investido TO preco_unitario_compra;

ALTER TABLE investments 
RENAME COLUMN preco_atual TO preco_unitario_atual;

-- Add comments for clarity
COMMENT ON COLUMN investments.preco_unitario_compra IS 'Unit price at purchase time';
COMMENT ON COLUMN investments.preco_unitario_atual IS 'Current unit price';
COMMENT ON COLUMN investments.quantidade IS 'Number of units/shares purchased';