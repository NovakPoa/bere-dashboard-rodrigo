import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, PaymentMethod } from "@/types/expense";
import { groupByMethod } from "@/lib/finance";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Crédito",
};

const METHOD_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--org-blue))", 
  "hsl(var(--org-green))"
];

export default function MethodChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const grouped = groupByMethod(expenses);
    return Object.entries(grouped).map(([name, value]) => ({ 
      name: METHOD_LABELS[name as PaymentMethod], 
      value 
    }));
  }, [expenses]);

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Gastos por Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Nenhum dado disponível para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Gastos por Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              dataKey="value" 
              data={data} 
              cx="50%" 
              cy="50%" 
              innerRadius={60} 
              outerRadius={120}
              fill="hsl(var(--primary))"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
