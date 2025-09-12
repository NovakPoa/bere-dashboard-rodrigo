import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import { useInvestmentTransactions, useDeleteTransaction } from "@/hooks/useInvestmentTransactions";
import { useInvestmentPrices, useUpsertInvestmentPrice, useDeleteInvestmentPrice } from "@/hooks/useInvestmentPriceHistory";
import { TransactionForm } from "@/components/investments/TransactionForm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { currency, formatQuantity } from "@/lib/investments";
import { toast } from "sonner";

export default function InvestmentDetails() {
  const { investmentId } = useParams<{ investmentId: string }>();
  const navigate = useNavigate();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: investments = [], isLoading: loadingInvestments } = useInvestments();
  const { data: transactions = [], isLoading: loadingTransactions } = useInvestmentTransactions(investmentId);
  const { data: priceHistory = [], isLoading: loadingPrices } = useInvestmentPrices(investmentId || "");

  const deleteTransaction = useDeleteTransaction();
  const upsertPrice = useUpsertInvestmentPrice();
  const deletePrice = useDeleteInvestmentPrice();

  if (!investmentId || investmentId === "new") {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Selecione um investimento para ver os detalhes.</p>
        </div>
      </div>
    );
  }

  const investment = investments.find(inv => inv.id === investmentId);

  if (loadingInvestments) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Investimento não encontrado.</p>
        </div>
      </div>
    );
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      try {
        await deleteTransaction.mutateAsync(transactionId);
      } catch (error) {
        console.error("Erro ao excluir transação:", error);
      }
    }
  };

  const handleUpdatePrice = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error("Preço deve ser um valor positivo");
      return;
    }

    const priceDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
    
    try {
        await upsertPrice.mutateAsync({
          investmentId: investmentId,
          price: parseFloat(newPrice),
          priceDate: priceDate,
        });
      setNewPrice("");
      toast.success("Preço atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar preço:", error);
      toast.error("Erro ao atualizar preço");
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (confirm("Tem certeza que deseja excluir este preço?")) {
      try {
        await deletePrice.mutateAsync({ id: priceId, investmentId: investmentId });
        toast.success("Preço excluído com sucesso");
      } catch (error) {
        console.error("Erro ao excluir preço:", error);
        toast.error("Erro ao excluir preço");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return currency(value, investment.moeda);
  };

  const handlePriceChange = (value: string) => {
    const numericValue = value.replace(/[^\d.,]/g, "").replace(",", ".");
    setNewPrice(numericValue);
  };

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  // Calculate transaction summary
  const summary = transactions.reduce(
    (acc, transaction) => {
      const value = transaction.quantity * transaction.unit_price;
      if (transaction.transaction_type === "BUY") {
        acc.totalBought += transaction.quantity;
        acc.totalInvested += value;
      } else {
        acc.totalSold += transaction.quantity;
        acc.totalReceived += value;
      }
      return acc;
    },
    { totalBought: 0, totalSold: 0, totalInvested: 0, totalReceived: 0 }
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/financeiro/investimentos")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{investment.nome_investimento}</h1>
      </div>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Investimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Quantidade Atual</p>
            <p className="text-2xl font-semibold">{formatQuantity(investment.current_quantity)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Preço Médio de Compra</p>
            <p className="text-2xl font-semibold">{formatCurrency(investment.average_purchase_price)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Preço Atual</p>
            <p className="text-2xl font-semibold">{formatCurrency(investment.preco_unitario_atual)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resultado Realizado</p>
            <p className={`text-2xl font-semibold ${investment.realized_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(investment.realized_profit_loss)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Transactions and Prices */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="prices">Histórico de Preços</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Transaction Form */}
          {showTransactionForm ? (
            <TransactionForm
              investment={investment}
              onSuccess={() => setShowTransactionForm(false)}
              onCancel={() => setShowTransactionForm(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gerenciar Transações</CardTitle>
                  <Button onClick={() => setShowTransactionForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Transação
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Comprado</p>
                  <p className="text-lg font-semibold">{formatQuantity(summary.totalBought)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-lg font-semibold">{formatQuantity(summary.totalSold)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Investido</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.totalInvested)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.totalReceived)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-4">Carregando transações...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
                  <Button 
                    onClick={() => setShowTransactionForm(true)}
                    className="mt-4"
                  >
                    Adicionar primeira transação
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Preço Unitário</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.transaction_date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.transaction_type === "BUY" ? "default" : "secondary"}>
                              {transaction.transaction_type === "BUY" ? "Compra" : "Venda"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatQuantity(transaction.quantity)}</TableCell>
                          <TableCell>{formatCurrency(transaction.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(transaction.quantity * transaction.unit_price)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={deleteTransaction.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prices Tab */}
        <TabsContent value="prices" className="space-y-6">
          {/* Price Update Form */}
          <Card>
            <CardHeader>
              <CardTitle>Atualizar Preço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
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
                <div>
                  <Label htmlFor="year">Ano</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Preço ({investment.moeda})</Label>
                  <Input
                    id="price"
                    type="text"
                    value={newPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <Button 
                onClick={handleUpdatePrice}
                disabled={upsertPrice.isPending || !newPrice}
              >
                {upsertPrice.isPending ? "Salvando..." : "Salvar Preço"}
              </Button>
            </CardContent>
          </Card>

          {/* Price History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Preços</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrices ? (
                <div className="text-center py-4">Carregando preços...</div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum preço histórico encontrado.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Rentabilidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory
                      .sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime())
                      .map((price, index, array) => {
                        const earliestPrice = array[array.length - 1]?.price || price.price;
                        const rentability = ((price.price - earliestPrice) / earliestPrice) * 100;
                        
                        return (
                          <TableRow key={price.id}>
                            <TableCell>
                              {new Date(price.price_date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>{formatCurrency(price.price)}</TableCell>
                            <TableCell>
                              <span className={rentability >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {rentability.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePrice(price.id)}
                                disabled={deletePrice.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}