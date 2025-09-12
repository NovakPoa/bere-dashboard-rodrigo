import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInvestments } from "@/hooks/useInvestments";
import { useInvestmentTransactions, useAddTransaction, useDeleteTransaction } from "@/hooks/useInvestmentTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { currency, formatQuantity } from "@/lib/investments";
import { parseDateFromDatabase } from "@/lib/utils";
import { TransactionForm } from "@/components/investments/TransactionForm";

export default function InvestmentTransactions() {
  const { investmentId } = useParams<{ investmentId: string }>();
  const navigate = useNavigate();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [], isLoading } = useInvestmentTransactions(investmentId!);
  const deleteTransaction = useDeleteTransaction();

  const [showForm, setShowForm] = useState(false);

  const investment = investments.find(inv => inv.id === investmentId);

  if (!investment) {
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

  const handleDelete = async (transactionId: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      await deleteTransaction.mutateAsync(transactionId);
    }
  };

  const handleTransactionAdded = () => {
    setShowForm(false);
  };

  // Calcular resumo das transações
  const summary = transactions.reduce((acc, transaction) => {
    if (transaction.transaction_type === 'BUY') {
      acc.totalBought += Number(transaction.quantity);
      acc.totalInvested += Number(transaction.quantity) * Number(transaction.unit_price);
    } else {
      acc.totalSold += Number(transaction.quantity);
      acc.totalReceived += Number(transaction.quantity) * Number(transaction.unit_price);
    }
    return acc;
  }, {
    totalBought: 0,
    totalSold: 0,
    totalInvested: 0,
    totalReceived: 0,
  });

  const currentQuantity = summary.totalBought - summary.totalSold;
  const averagePurchasePrice = summary.totalBought > 0 ? summary.totalInvested / summary.totalBought : 0;
  const realizedProfitLoss = summary.totalReceived - (summary.totalSold * averagePurchasePrice);

  if (isLoading) {
    return <div className="container mx-auto py-6">Carregando transações...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            Transações - {investment.nome_investimento}
          </h1>
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Resumo do Ativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Quantidade Atual</label>
              <p className="font-medium">{formatQuantity(currentQuantity)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Preço Médio de Compra</label>
              <p className="font-medium">{currency(averagePurchasePrice, investment.moeda)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Total Investido</label>
              <p className="font-medium">{currency(summary.totalInvested, investment.moeda)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Total Recebido</label>
              <p className="font-medium">{currency(summary.totalReceived, investment.moeda)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Resultado Realizado</label>
              <p className={`font-medium ${realizedProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currency(realizedProfitLoss, investment.moeda)}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Valor Atual</label>
              <p className="font-medium">{currency(currentQuantity * Number(investment.preco_unitario_atual), investment.moeda)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form */}
      {showForm && (
        <TransactionForm
          investment={investment}
          onSuccess={handleTransactionAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma transação registrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Adicione transações de compra e venda para acompanhar seu histórico
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Unitário</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                    .map((transaction) => {
                      const totalValue = Number(transaction.quantity) * Number(transaction.unit_price);
                      
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(parseDateFromDatabase(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.transaction_type === 'BUY' ? 'default' : 'secondary'}>
                              {transaction.transaction_type === 'BUY' ? 'Compra' : 'Venda'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQuantity(Number(transaction.quantity))}
                          </TableCell>
                          <TableCell className="text-right">
                            {currency(Number(transaction.unit_price), investment.moeda)}
                          </TableCell>
                          <TableCell className="text-right">
                            {currency(totalValue, investment.moeda)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}