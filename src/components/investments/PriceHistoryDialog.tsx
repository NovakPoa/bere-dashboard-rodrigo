import { useState } from "react";
import { Investment } from "@/types/investment";
import { InvestmentSnapshot } from "@/types/investment-snapshot";
import { useInvestmentSnapshots, useCreateSnapshot } from "@/hooks/useInvestmentSnapshots";
import { useExchangeRate } from "@/hooks/useInvestments";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { currency, formatQuantity } from "@/lib/investments";

interface PriceHistoryDialogProps {
  investment: Investment;
  onUpdated: () => void;
  children: React.ReactNode;
}

export function PriceHistoryDialog({ investment, onUpdated, children }: PriceHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [preco, setPreco] = useState(0);
  const [quantidade, setQuantidade] = useState(investment.quantidade);
  const [precoString, setPrecoString] = useState("");
  
  const { data: snapshots = [] } = useInvestmentSnapshots();
  const { data: exchangeRate = 5.0 } = useExchangeRate();
  const createSnapshot = useCreateSnapshot();

  // Filter snapshots for this investment
  const investmentSnapshots = snapshots.filter(
    (snapshot) => snapshot.investment_id === investment.id
  );

  // Generate month and year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSelectedMonth("");
      setSelectedYear("");
      setPreco(investment.preco_unitario_atual);
      setQuantidade(investment.quantidade);
      const formattedValue = (investment.preco_unitario_atual * 100).toString();
      setPrecoString(formatCurrency(formattedValue, investment.moeda));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMonth || !selectedYear) return;

    // Create snapshot date (last day of selected month)
    const lastDayOfMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
    const snapshotDate = format(lastDayOfMonth, "yyyy-MM-dd");

    // Create a temporary investment object with the new values
    const tempInvestment: Investment = {
      ...investment,
      preco_unitario_atual: preco,
      quantidade: quantidade,
    };

    createSnapshot.mutate(
      {
        investment: tempInvestment,
        snapshotDate: snapshotDate,
        exchangeRate: exchangeRate,
      },
      {
        onSuccess: () => {
          setSelectedMonth("");
          setSelectedYear("");
          setPreco(investment.preco_unitario_atual);
          setQuantidade(investment.quantidade);
          setPrecoString("");
          onUpdated();
        },
      }
    );
  };

  const formatCurrency = (value: string, currencyType: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = parseFloat(numericValue) / 100;
    const locale = currencyType === "USD" ? "en-US" : "pt-BR";
    return floatValue.toLocaleString(locale, {
      style: "currency",
      currency: currencyType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Preços - {investment.nome_investimento}</DialogTitle>
          <DialogDescription>
            Gerencie o histórico de preços e quantidades por mês/ano
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Price History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Novo Registro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Mês</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preco">Preço Unitário</Label>
                  <Input
                    id="preco"
                    placeholder={investment.moeda === "USD" ? "US$ 0.00" : "R$ 0,00"}
                    value={precoString}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const floatValue = parseFloat(value) / 100;
                      setPreco(floatValue || 0);
                      setPrecoString(formatCurrency(value, investment.moeda));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step="0.000001"
                    placeholder="0"
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createSnapshot.isPending || !selectedMonth || !selectedYear || preco <= 0}
                >
                  {createSnapshot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar Registro
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Historical Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico Existente</CardTitle>
            </CardHeader>
            <CardContent>
              {investmentSnapshots.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum histórico encontrado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investmentSnapshots
                        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())
                        .map((snapshot) => (
                          <TableRow key={snapshot.id}>
                            <TableCell>
                              {format(new Date(snapshot.snapshot_date), "MMM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              {currency(snapshot.preco_unitario, investment.moeda)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatQuantity(snapshot.quantidade)}
                            </TableCell>
                            <TableCell className="text-right">
                              {currency(snapshot.valor_total_brl, "BRL")}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}