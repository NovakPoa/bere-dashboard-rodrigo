import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Investment } from "@/types/investment";
import { groupByCurrency, currency, CURRENCY_LABELS } from "@/lib/investments";

interface CurrencyChartProps {
  investments: Investment[];
  exchangeRate?: number;
}

const COLORS = {
  BRL: "#10b981", // verde para real
  USD: "#3b82f6", // azul para dólar
};

export function CurrencyChart({ investments, exchangeRate = 5.0 }: CurrencyChartProps) {
  const chartData = useMemo(() => {
    const groupedData = groupByCurrency(investments, exchangeRate);
    
    return Object.entries(groupedData)
      .filter(([_, value]) => value > 0)
      .map(([currencyType, value]) => ({
        name: CURRENCY_LABELS[currencyType as keyof typeof CURRENCY_LABELS],
        value,
        currency: currencyType,
      }));
  }, [investments, exchangeRate]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Moeda</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">{currency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Moeda</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.currency as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}