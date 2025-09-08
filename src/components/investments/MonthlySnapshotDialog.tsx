import { useState } from "react";
import { format, lastDayOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Check, TrendingUp } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Investment } from "@/types/investment";
import { useCreateSnapshot, useCreateBatchSnapshots } from "@/hooks/useInvestmentSnapshots";
import { currency } from "@/lib/investments";

interface MonthlySnapshotDialogProps {
  investments: Investment[];
  exchangeRate: number;
  children: React.ReactNode;
}

export function MonthlySnapshotDialog({
  investments,
  exchangeRate,
  children,
}: MonthlySnapshotDialogProps) {
  const [open, setOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(() => {
    const today = new Date();
    return format(lastDayOfMonth(today), "yyyy-MM-dd");
  });
  const [selectedInvestments, setSelectedInvestments] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const createSnapshot = useCreateSnapshot();
  const createBatchSnapshots = useCreateBatchSnapshots();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form when opening
      setSelectedInvestments([]);
      setSelectAll(false);
      const today = new Date();
      setSnapshotDate(format(lastDayOfMonth(today), "yyyy-MM-dd"));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedInvestments(investments.map(inv => inv.id));
    } else {
      setSelectedInvestments([]);
    }
  };

  const handleInvestmentToggle = (investmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvestments(prev => [...prev, investmentId]);
    } else {
      setSelectedInvestments(prev => prev.filter(id => id !== investmentId));
      setSelectAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedInvestments.length === 0) {
      return;
    }

    const selectedInvestmentObjects = investments.filter(inv => 
      selectedInvestments.includes(inv.id)
    );

    if (selectedInvestmentObjects.length === 1) {
      await createSnapshot.mutateAsync({
        investment: selectedInvestmentObjects[0],
        snapshotDate,
        exchangeRate,
      });
    } else {
      await createBatchSnapshots.mutateAsync({
        investments: selectedInvestmentObjects,
        snapshotDate,
        exchangeRate,
      });
    }

    setOpen(false);
  };

  const isLoading = createSnapshot.isPending || createBatchSnapshots.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Criar Snapshot Mensal
          </DialogTitle>
          <DialogDescription>
            Selecione os investimentos para criar um snapshot dos preços atuais.
            Isso permitirá acompanhar a rentabilidade mês a mês.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="snapshot-date">Data do Snapshot</Label>
            <Input
              id="snapshot-date"
              type="date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Recomendamos usar o último dia do mês para snapshots mensais
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Investimentos</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Selecionar todos ({investments.length})
                </Label>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-3">
                {investments.map((investment) => {
                  const isSelected = selectedInvestments.includes(investment.id);
                  const valorAtual = investment.moeda === "USD"
                    ? investment.preco_unitario_atual * investment.quantidade * exchangeRate
                    : investment.preco_unitario_atual * investment.quantidade;

                  return (
                    <div
                      key={investment.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        id={investment.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleInvestmentToggle(investment.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium truncate">
                              {investment.nome_investimento}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {investment.tipo_investimento} • {investment.corretora}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {currency(valorAtual)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {investment.quantidade.toLocaleString("pt-BR")} × {currency(investment.preco_unitario_atual, investment.moeda)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {selectedInvestments.length} investimento(s) selecionado(s)
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={selectedInvestments.length === 0 || isLoading}
              >
                {isLoading ? (
                  "Criando..."
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Criar Snapshot{selectedInvestments.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}