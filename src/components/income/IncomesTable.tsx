import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateFromDatabase } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRemoveIncome } from "@/hooks/useIncome";
import type { Income, PaymentMethod } from "@/types/income";
import UpdateIncomeDialog from "./UpdateIncomeDialog";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit: "Crédito", 
  boleto: "Boleto"
};

export default function IncomesTable({ incomes, onChange }: { incomes: Income[]; onChange: () => void }) {
  const rows = useMemo(() => incomes, [incomes]);
  const removeIncome = useRemoveIncome();

  const handleDelete = (id: string) => {
    removeIncome.mutate(id, {
      onSuccess: () => onChange()
    });
  };

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base md:text-lg font-medium">Todos os Ganhos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Nenhum ganho encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-24">Data</TableHead>
                  <TableHead className="min-w-32">Descrição</TableHead>
                  <TableHead className="min-w-24">Categoria</TableHead>
                  <TableHead className="min-w-24">Método</TableHead>
                  <TableHead className="min-w-20">Parcela</TableHead>
                  <TableHead className="min-w-24 text-right">Valor</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="text-xs md:text-sm">
                      {format(parseDateFromDatabase(income.date), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm font-medium max-w-40 truncate">
                      {income.note || "Sem descrição"}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">
                      {income.category}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">
                      {METHOD_LABELS[income.method]}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">
                      {income.isInstallment && income.installmentNumber && income.installmentsTotal
                        ? `${income.installmentNumber}/${income.installmentsTotal}`
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-xs md:text-sm font-medium text-right text-green-600">
                      {currency(income.amount)}
                    </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <UpdateIncomeDialog income={income}>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6 text-muted-foreground hover:text-primary"
                           >
                             <Edit className="h-3 w-3" />
                           </Button>
                         </UpdateIncomeDialog>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-6 w-6 text-muted-foreground hover:text-destructive"
                           onClick={() => handleDelete(income.id)}
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
        )}
      </CardContent>
    </Card>
  );
}