import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { DailyHealthData } from "@/hooks/useHealth";

interface HealthChartProps {
  data: DailyHealthData[];
}

const chartConfig = {
  consumedCalories: {
    label: "Calorias Consumidas",
    color: "hsl(var(--success))",
  },
  burnedCalories: {
    label: "Calorias Gastas (Total)",
    color: "hsl(var(--destructive))",
  },
  exerciseCalories: {
    label: "Calorias do Exercício",
    color: "hsl(var(--warning))",
  },
  bmrCalories: {
    label: "Taxa Metabólica Basal",
    color: "hsl(var(--muted-foreground))",
  },
} as const;

export default function HealthChart({ data }: HealthChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    displayDate: format(parseISO(item.date), 'dd/MM'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balanço Calórico Diário</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayDate" 
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(v) => `${v}`}
                fontSize={12}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const labels = {
                        consumedCalories: 'Consumidas',
                        burnedCalories: 'Gastas (Total)',
                        exerciseCalories: 'Exercício',
                        bmrCalories: 'TMB'
                      };
                      return [
                        `${Math.round(Number(value))} kcal`,
                        labels[name as keyof typeof labels] || name
                      ];
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                }
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="consumedCalories"
                stroke={chartConfig.consumedCalories.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="burnedCalories"
                stroke={chartConfig.burnedCalories.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="exerciseCalories"
                stroke={chartConfig.exerciseCalories.color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="bmrCalories"
                stroke={chartConfig.bmrCalories.color}
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}