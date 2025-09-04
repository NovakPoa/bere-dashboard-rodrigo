import { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Income, PaymentMethod } from "@/types/income";
import { groupByMethod } from "@/lib/income";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit: "Crédito",
  boleto: "Boleto"
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  pix: "hsl(var(--org-blue))",
  credit: "hsl(var(--org-green))", 
  boleto: "hsl(var(--org-orange))"
};

export default function MethodChart({ incomes }: { incomes: Income[] }) {
  const data = useMemo(() => {
    const grouped = groupByMethod(incomes);
    return Object.entries(grouped).map(([method, value]) => ({
      name: METHOD_LABELS[method as PaymentMethod],
      value,
      fill: METHOD_COLORS[method as PaymentMethod]
    }));
  }, [incomes]);

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (data.length === 0) {
    return (
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base md:text-lg font-medium">Ganhos por Método</CardTitle>
        </CardHeader>
        <CardContent className="h-64 md:h-80 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base md:text-lg font-medium">Ganhos por Método</CardTitle>
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
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
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