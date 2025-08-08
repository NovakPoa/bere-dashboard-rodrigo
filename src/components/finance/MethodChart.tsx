import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, PaymentMethod } from "@/types/expense";
import { groupByMethod } from "@/lib/finance";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Credit",
};

export default function MethodChart({ expenses }: { expenses: Expense[] }) {
  const data = useMemo(() => {
    const grouped = groupByMethod(expenses);
    return Object.entries(grouped).map(([name, value]) => ({ name: METHOD_LABELS[name as PaymentMethod], value }));
  }, [expenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">By Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
