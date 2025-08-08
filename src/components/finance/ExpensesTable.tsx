import { useMemo } from "react";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { removeExpense } from "@/lib/finance";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function ExpensesTable({ expenses, onChange }: { expenses: Expense[]; onChange: () => void }) {
  const rows = useMemo(() => expenses, [expenses]);

  const handleDelete = (id: string) => {
    removeExpense(id);
    toast({ title: "Deleted" });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{new Date(e.date).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{e.category}</TableCell>
                  <TableCell className="capitalize">{e.method}</TableCell>
                  <TableCell className="text-right font-medium">{e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleDelete(e.id)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No expenses yet. Paste a WhatsApp message to add your first one.
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
