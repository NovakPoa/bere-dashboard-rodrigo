import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types/expense";
import { groupByCategory } from "@/lib/finance";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "hsl(var(--secondary))", "hsl(var(--ring))"];

export default function CategoryChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const grouped = groupByCategory(expenses);
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">By Category</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={data} fill="hsl(var(--primary))" label>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
