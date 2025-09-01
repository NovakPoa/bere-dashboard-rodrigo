import { useMemo } from "react";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRemoveExpense } from "@/hooks/useFinance";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { parseDateOnly } from "@/lib/finance";


const METHOD_LABELS: Record<Expense["method"], string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Crédito",
};

export default function ExpensesTable({ expenses, onChange }: { expenses: Expense[]; onChange: () => void }) {
  const rows = useMemo(() => expenses, [expenses]);
  const removeExpense = useRemoveExpense();

  const handleDelete = (id: string) => {
    removeExpense.mutate(id, {
      onSuccess: () => {
        toast({ title: "Excluído" });
        onChange();
      }
    });
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Despesas recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[70px] text-xs md:text-sm">Data</TableHead>
                  <TableHead className="min-w-[80px] text-xs md:text-sm">Descrição</TableHead>
                  <TableHead className="min-w-[60px] text-xs md:text-sm">Categoria</TableHead>
                  <TableHead className="min-w-[70px] text-xs md:text-sm">Forma de pagamento</TableHead>
                  <TableHead className="text-right min-w-[60px] text-xs md:text-sm">Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">{parseDateOnly(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs md:text-sm truncate max-w-[120px]" title={e.note || ''}>
                    {e.note || '-'}
                  </TableCell>
                  <TableCell className="capitalize text-xs md:text-sm">{e.category}</TableCell>
                  <TableCell className="capitalize text-xs md:text-sm">{METHOD_LABELS[e.method]}</TableCell>
                  <TableCell className="text-right font-medium text-xs md:text-sm">{e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => handleDelete(e.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Ainda não há despesas. Cole uma mensagem do WhatsApp para adicionar a primeira.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
