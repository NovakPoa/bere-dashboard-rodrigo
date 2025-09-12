import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Investment } from "@/types/investment";
import { useAddTransaction } from "@/hooks/useInvestmentTransactions";
import { currency } from "@/lib/investments";
import { format } from "date-fns";
import { toast } from "sonner";

interface TransactionFormProps {
  investment: Investment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({ investment, onSuccess, onCancel }: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const addTransaction = useAddTransaction();

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return investment.moeda === "USD" ? `US$ ${formattedValue}` : `R$ ${formattedValue}`;
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatCurrency(value);
    setUnitPrice(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantityValue = parseFloat(quantity);
    const priceValue = parseFloat(unitPrice.replace(/[^\d,.-]/g, '').replace(',', '.'));
    
    if (!quantityValue || quantityValue <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }
    
    if (!priceValue || priceValue <= 0) {
      toast.error("Preço deve ser maior que zero");
      return;
    }

    try {
      await addTransaction.mutateAsync({
        investment_id: investment.id,
        transaction_type: transactionType,
        quantity: quantityValue,
        unit_price: priceValue,
        transaction_date: transactionDate,
      });

      toast.success(`${transactionType === 'BUY' ? 'Compra' : 'Venda'} registrada com sucesso!`);
      
      // Reset form
      setQuantity("");
      setUnitPrice("");
      setTransactionDate(format(new Date(), "yyyy-MM-dd"));
      
      onSuccess();
    } catch (error) {
      toast.error("Erro ao registrar transação");
    }
  };

  const totalValue = quantity && unitPrice 
    ? parseFloat(quantity) * parseFloat(unitPrice.replace(/[^\d,.-]/g, '').replace(',', '.'))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nova Transação</span>
          <div className="flex gap-2">
            <Badge 
              variant={transactionType === 'BUY' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTransactionType('BUY')}
            >
              Compra
            </Badge>
            <Badge 
              variant={transactionType === 'SELL' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTransactionType('SELL')}
            >
              Venda
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date">Data da Transação</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="unitPrice">Preço Unitário</Label>
              <Input
                id="unitPrice"
                placeholder={investment.moeda === "USD" ? "US$ 0,00" : "R$ 0,00"}
                value={unitPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="totalValue">Valor Total</Label>
              <Input
                id="totalValue"
                value={totalValue > 0 ? currency(totalValue, investment.moeda) : currency(0, investment.moeda)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={addTransaction.isPending}
              variant={transactionType === 'BUY' ? 'default' : 'secondary'}
            >
              {addTransaction.isPending 
                ? "Salvando..." 
                : `Registrar ${transactionType === 'BUY' ? 'Compra' : 'Venda'}`
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}