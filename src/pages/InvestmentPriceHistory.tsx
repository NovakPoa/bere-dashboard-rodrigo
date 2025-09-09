import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInvestments } from "@/hooks/useInvestments";
import { useInvestmentPrices, useUpsertInvestmentPrice } from "@/hooks/useInvestmentPriceHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { currency } from "@/lib/investments";
import { formatDateForDatabase, parseDateFromDatabase } from "@/lib/utils";
import { Investment } from "@/types/investment";
import { toast } from "@/hooks/use-toast";

export default function InvestmentPriceHistory() {
  const { investmentId } = useParams<{ investmentId: string }>();
  const navigate = useNavigate();
  const { data: investments = [] } = useInvestments();
  const upsertPrice = useUpsertInvestmentPrice();

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const investment = investments.find(inv => inv.id === investmentId);
  const { data: priceHistory = [] } = useInvestmentPrices(investment?.id);
  const hasInitialInHistory = investment
    ? priceHistory.some((p) => p.price_date === investment.data_investimento)
    : false;
  if (!investment && investmentId !== "new") {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Investimento não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const handleUpdatePrice = () => {
    if (!investment) {
      toast({
        title: "Erro",
        description: "Investimento não encontrado",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMonth || !selectedYear || !newPrice) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const priceValue = parseFloat(newPrice.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um preço válido",
        variant: "destructive",
      });
      return;
    }

    // Create update date for the selected month/year (use last day of selected month)
    const year = parseInt(selectedYear, 10);
    const monthIndex = parseInt(selectedMonth, 10) - 1; // 0-based
    const updateDate = new Date(year, monthIndex + 1, 0);
    const priceDate = formatDateForDatabase(updateDate);

    // Prevent accidental overwrite if same date already exists
    const alreadyExists = priceHistory.some((p) => p.price_date === priceDate);
    if (alreadyExists) {
      const proceed = window.confirm("Já existe um preço para esta data. Deseja sobrescrever?");
      if (!proceed) return;
    }

    upsertPrice.mutate(
      {
        investmentId: investment.id,
        price: priceValue,
        priceDate,
      },
      {
        onSuccess: () => {
          toast({
            title: "Sucesso",
            description: "Preço registrado no histórico",
          });
          setSelectedMonth("");
          setSelectedYear("");
          setNewPrice("");
        },
        onError: (err: any) => {
          toast({
            title: "Erro",
            description: err?.message ?? "Falha ao salvar preço",
            variant: "destructive",
          });
        },
      }
    );
  };

  const formatCurrency = (value: string, currency: "BRL" | "USD") => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    const formattedValue = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return currency === "USD" ? `US$ ${formattedValue}` : `R$ ${formattedValue}`;
  };

  const handlePriceChange = (value: string) => {
    if (!investment) return;
    const formatted = formatCurrency(value, investment.moeda);
    setNewPrice(formatted);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/financeiro/investimentos")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {investment ? `Histórico de Preços - ${investment.nome_investimento}` : "Histórico de Preços"}
        </h1>
      </div>

      {investment && (
        <>
          {/* Investment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo do Investimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Nome</Label>
                  <p className="font-medium">{investment.nome_investimento}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Preço Atual</Label>
                  <p className="font-medium">{currency(investment.preco_unitario_atual, investment.moeda)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Última Atualização</Label>
                  <p className="font-medium">
                    {format(parseDateFromDatabase(investment.data_atualizacao_preco), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Price Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Registrar Preço do Ativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="month">Mês</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar mês" />
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

                <div>
                  <Label htmlFor="year">Ano</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar ano" />
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

                <div>
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    placeholder={investment.moeda === "USD" ? "US$ 0,00" : "R$ 0,00"}
                    value={newPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    value={investment.quantidade.toLocaleString('pt-BR')}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="totalValue">Valor Total</Label>
                  <Input
                    id="totalValue"
                    value={newPrice ? currency(parseFloat(newPrice.replace(/[^\d,.-]/g, '').replace(',', '.')) * investment.quantidade, investment.moeda) : currency(0, investment.moeda)}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleUpdatePrice}
                    disabled={upsertPrice.isPending}
                    className="w-full"
                  >
                    {upsertPrice.isPending ? "Salvando..." : "Salvar Preço"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Preços Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data de Atualização</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {format(parseDateFromDatabase(p.price_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(p.price, investment.moeda)}
                      </TableCell>
                      <TableCell className="text-right">
                        {investment.quantidade.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(p.price * investment.quantidade, investment.moeda)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!hasInitialInHistory && (
                    <TableRow>
                      <TableCell>
                        {format(parseDateFromDatabase(investment.data_investimento), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(investment.preco_unitario_compra, investment.moeda)}
                      </TableCell>
                      <TableCell className="text-right">
                        {investment.quantidade.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {currency(investment.preco_unitario_compra * investment.quantidade, investment.moeda)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {investmentId === "new" && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Primeiro adicione um investimento para gerenciar seu histórico de preços
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}