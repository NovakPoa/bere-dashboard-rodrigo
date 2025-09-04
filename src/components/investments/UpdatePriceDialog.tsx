import { useState } from "react";
import { Investment } from "@/types/investment";
import { useUpdateInvestment } from "@/hooks/useInvestments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UpdatePriceDialogProps {
  investment: Investment;
  onUpdated: () => void;
  children: React.ReactNode;
}

export function UpdatePriceDialog({ investment, onUpdated, children }: UpdatePriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [preco, setPreco] = useState(investment.preco_atual);
  const updateInvestment = useUpdateInvestment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateInvestment.mutate(
      {
        id: investment.id,
        updates: { preco_atual: preco },
      },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdated();
        },
      }
    );
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar Preço</DialogTitle>
          <DialogDescription>
            Atualize o preço atual do investimento {investment.nome_investimento}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preco">Novo Preço</Label>
            <Input
              id="preco"
              placeholder="R$ 0,00"
              value={preco > 0 ? formatCurrency(preco.toString()) : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                const floatValue = parseFloat(value) / 100;
                setPreco(floatValue || 0);
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateInvestment.isPending || preco <= 0}
            >
              {updateInvestment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}