import { useMemo } from "react";
import { Investment } from "@/types/investment";
import { useRemoveInvestment } from "@/hooks/useInvestments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp, TrendingDown, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { currency, percentage, formatQuantity, formatLabel } from "@/lib/investments";

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
                <TableHead>Data</TableHead>
                <TableHead className="w-20">Ações</TableHead>
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
                    {formatQuantity(investment.quantidade)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currency(investment.valor_total_investido, investment.moeda)}
                  </TableCell>
                  <TableCell className="text-right">
                    {currency(investment.valor_atual_total, investment.moeda)}
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
                  <TableCell>
                    {format(new Date(investment.data_investimento), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/financeiro/investimentos/${investment.id}/historico-precos`)}
                        aria-label="Editar investimento"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(investment.id)}
                        aria-label="Excluir investimento"
                      >
                        <Trash2 className="h-3 w-3" />
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