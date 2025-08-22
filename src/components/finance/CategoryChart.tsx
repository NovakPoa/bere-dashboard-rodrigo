import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types/expense";
import { groupByCategory } from "@/lib/finance";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--org-blue))", 
  "hsl(var(--org-green))",
  "hsl(var(--org-orange))",
  "hsl(var(--org-purple))",
  "hsl(var(--org-pink))",
  "hsl(var(--org-red))",
  "hsl(var(--org-yellow))"
];

export default function CategoryChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const grouped = groupByCategory(expenses);
    return Object.entries(grouped).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [expenses]);

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Gastos por Categoria</CardTitle>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
