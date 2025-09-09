import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Investment } from "@/types/investment";
import { currency, percentage } from "@/lib/investments";
import { generateRentabilityData } from "@/lib/investments";

interface RentabilityChartProps {
  investments: Investment[];
  selectedPeriod: "7days" | "month" | "year";
  selectedNames: string[];
  selectedTypes: string[];
  showValue: boolean; // true for R$, false for %
  priceHistory?: any[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const RentabilityChart: React.FC<RentabilityChartProps> = ({
  investments,
  selectedPeriod,
  selectedNames,
  selectedTypes,
  showValue,
  priceHistory = [],
}) => {
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      const nameMatch = selectedNames.length === 0 || selectedNames.includes(inv.nome_investimento);
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(inv.tipo_investimento);
      return nameMatch && typeMatch;
    });
  }, [investments, selectedNames, selectedTypes]);

  const chartData = useMemo(() => {
    return generateRentabilityData(filteredInvestments, selectedPeriod, priceHistory);
  }, [filteredInvestments, selectedPeriod, priceHistory]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {showValue ? currency(entry.value) : percentage(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    return showValue ? currency(value) : percentage(value);
  };

  if (filteredInvestments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rentabilidade no Tempo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum investimento selecionado para exibir</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Rentabilidade no Tempo ({showValue ? "Valor Absoluto" : "Percentual"})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {filteredInvestments.map((investment, index) => (
              <Line
                key={investment.id}
                type="monotone"
                dataKey={showValue ? investment.id : `${investment.id}_percent`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                name={investment.nome_investimento}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};