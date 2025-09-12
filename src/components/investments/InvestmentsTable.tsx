import { useState, useMemo } from "react";
import { Investment } from "@/types/investment";
import { useRemoveInvestment } from "@/hooks/useInvestments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp, TrendingDown, Edit, History, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { currency, percentage, formatQuantity, formatLabel } from "@/lib/investments";
import { parseDateFromDatabase } from "@/lib/utils";


interface InvestmentsTableProps {
  investments: Investment[];
  onChange: () => void;
}

export function InvestmentsTable({ investments, onChange }: InvestmentsTableProps) {
  const memoizedInvestments = useMemo(() => investments, [investments]);
  const removeInvestment = useRemoveInvestment();
  const navigate = useNavigate();

  const handleDelete = (id: string) => {
    console.log("[InvestmentsTable] Deleting investment", id);
    removeInvestment.mutate(id, {
      onSuccess: () => {
        onChange();
      },
    });
  };

  const handleEdit = (investment: Investment) => {
    navigate(`/financeiro/investimentos/${investment.id}/precos`);
  };

  const handleTransactions = (investment: Investment) => {
    navigate(`/financeiro/investimentos/${investment.id}/transacoes`);
  };

  if (memoizedInvestments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todos Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Nenhum investimento encontrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos Investimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Corretora</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor Investido</TableHead>
                <TableHead className="text-right">Valor Atual</TableHead>
                <TableHead className="text-right">Rentabilidade</TableHead>
                <TableHead className="text-right">Resultado Realizado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Gerenciar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memoizedInvestments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">
                    {investment.nome_investimento}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatLabel(investment.tipo_investimento)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatLabel(investment.corretora)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(investment.current_quantity)}
                    {investment.is_closed && <span className="text-muted-foreground ml-1">(Fechado)</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {currency(investment.current_quantity * investment.average_purchase_price, investment.moeda)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currency(investment.current_quantity * investment.preco_unitario_atual, investment.moeda)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {investment.rentabilidade_absoluta >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                       <div className={investment.rentabilidade_absoluta >= 0 ? "text-green-600" : "text-red-600"}>
                         <div>{currency(investment.rentabilidade_absoluta, investment.moeda)}</div>
                         <div className="text-xs">
                           {percentage(investment.rentabilidade_percentual)}
                         </div>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={investment.realized_profit_loss >= 0 ? "text-green-600" : "text-red-600"}>
                      {currency(investment.realized_profit_loss, investment.moeda)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(parseDateFromDatabase(investment.data_investimento), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(investment)}
                          title="Histórico de preços"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTransactions(investment)}
                          title="Gerenciar transações"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(investment.id)}
                          title="Excluir investimento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}