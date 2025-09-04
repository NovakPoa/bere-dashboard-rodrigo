import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Income } from "@/types/income";
import { groupByCategory } from "@/lib/income";

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

export default function CategoryChart({ incomes }: { incomes: Income[] }) {
  const data = useMemo(() => {
    const grouped = groupByCategory(incomes);
    return Object.entries(grouped).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [incomes]);

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base md:text-lg font-medium">Ganhos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              dataKey="value" 
              data={data} 
              cx="50%" 
              cy="50%" 
              innerRadius={40} 
              outerRadius={80}
              fill="hsl(var(--primary))"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Legend wrapperStyle={{ maxWidth: "100%", overflow: "hidden", fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}