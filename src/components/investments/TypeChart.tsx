import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Investment } from "@/types/investment";
import { groupByType, currency, INVESTMENT_TYPE_LABELS } from "@/lib/investments";

interface TypeChartProps {
  investments: Investment[];
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green  
  "#f59e0b", // yellow
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#6b7280", // gray
];

export function TypeChart({ investments }: TypeChartProps) {
  const chartData = useMemo(() => {
    const groupedData = groupByType(investments);
    
    return Object.entries(groupedData)
      .filter(([_, value]) => value > 0)
      .map(([type, value]) => ({
        name: INVESTMENT_TYPE_LABELS[type as keyof typeof INVESTMENT_TYPE_LABELS],
        value,
        formattedValue: currency(value),
      }));
  }, [investments]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.payload.formattedValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Tipo</CardTitle>
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
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}