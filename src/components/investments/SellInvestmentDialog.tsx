import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Investment } from "@/types/investment";
import { useAddTransaction } from "@/hooks/useInvestmentTransactions";
import { currency } from "@/lib/investments";
import { format } from "date-fns";

interface SellInvestmentDialogProps {
  investment: Investment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SellInvestmentDialog({ investment, open, onOpenChange }: SellInvestmentDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const addTransaction = useAddTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(unitPrice);

    if (!quantityNum || !priceNum || quantityNum <= 0 || priceNum <= 0) {
      return;
    }

    if (quantityNum > investment.current_quantity) {
      alert(`Quantidade máxima disponível: ${investment.current_quantity}`);
      return;
    }

    try {
      await addTransaction.mutateAsync({
        investment_id: investment.id,
        transaction_type: "SELL",
        quantity: quantityNum,
        unit_price: priceNum,
        transaction_date: saleDate,
      });

      setQuantity("");
      setUnitPrice("");
      setSaleDate(format(new Date(), "yyyy-MM-dd"));
      onOpenChange(false);
    } catch (error) {
      console.error("Error selling investment:", error);
    }
  };

  const saleValue = quantity && unitPrice ? parseFloat(quantity) * parseFloat(unitPrice) : 0;
  const potentialGainLoss = quantity && unitPrice 
    ? (parseFloat(unitPrice) - investment.average_purchase_price) * parseFloat(quantity)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vender {investment.nome_investimento}</DialogTitle>
          <DialogDescription>
            Disponível: {investment.current_quantity} ações
            <br />
            Preço médio de compra: {currency(investment.average_purchase_price, investment.moeda)}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              step="0.000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantidade a vender"
              max={investment.current_quantity}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="price">Preço de Venda</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Preço por unidade"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Data da Venda</Label>
            <Input
              id="date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
          </div>

          {saleValue > 0 && (
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div>Valor da venda: {currency(saleValue, investment.moeda)}</div>
              <div className={potentialGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                Lucro/Prejuízo: {currency(potentialGainLoss, investment.moeda)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "Vendendo..." : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}