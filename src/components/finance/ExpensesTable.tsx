import { useMemo } from "react";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { removeExpense } from "@/lib/finance";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const CATEGORY_LABELS: Record<Expense["category"], string> = {
  alimentacao: "Alimentação",
  assinaturas: "Assinaturas",
  casa: "Casa",
  lazer: "Lazer",
  mercado: "Mercado",
  presentes: "Presentes",
  saude: "Saúde",
  transporte: "Transporte",
  utilidades: "Utilidades",
  outros: "Outros",
};

const METHOD_LABELS: Record<Expense["method"], string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Crédito",
};

export default function ExpensesTable({ expenses, onChange }: { expenses: Expense[]; onChange: () => void }) {
  const rows = useMemo(() => expenses, [expenses]);

  const handleDelete = (id: string) => {
    removeExpense(id);
    toast({ title: "Excluído" });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Despesas recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{new Date(e.date).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{CATEGORY_LABELS[e.category]}</TableCell>
                  <TableCell className="capitalize">{METHOD_LABELS[e.method]}</TableCell>
                  <TableCell className="text-right font-medium">{e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => handleDelete(e.id)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
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
