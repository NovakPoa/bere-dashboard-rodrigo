import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface GarminChartProps {
  data: Array<Record<string, number | string>>;
  modalities: string[];
}

const getModalityColor = (modality: string, index: number) => {
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(142, 76%, 36%)", // green
    "hsl(262, 83%, 58%)", // purple
    "hsl(291, 64%, 42%)", // pink
    "hsl(24, 70%, 55%)",  // orange
  ];
  
  // Cores específicas para atividades do Garmin
  if (modality.includes('run')) return "hsl(142, 76%, 36%)"; // verde para corrida
  if (modality.includes('cycl') || modality.includes('bike')) return "hsl(220, 100%, 50%)"; // azul para ciclismo
  if (modality.includes('swim')) return "hsl(200, 100%, 40%)"; // azul água para natação
  
  return colors[index % colors.length];
};

export default function GarminChart({ data, modalities }: GarminChartProps) {
  const chartConfig = modalities.reduce((config, modality, index) => {
    const cleanModality = modality.replace('terra-', '').replace('garmin-', '');
    config[modality] = {
      label: cleanModality.charAt(0).toUpperCase() + cleanModality.slice(1),
      color: getModalityColor(modality, index),
    };
    return config;
  }, {} as Record<string, { label: string; color: string }>);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Nenhum dado para exibir no gráfico
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="dia" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ 
              value: 'Minutos', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              labelFormatter={(value) => `Dia ${value}`}
              formatter={(value, name) => [
                `${value} min`,
                chartConfig[name as string]?.label || name
              ]}
            />} 
          />
          <Legend 
            formatter={(value) => chartConfig[value]?.label || value}
            wrapperStyle={{ paddingTop: '20px' }}
          />
          {modalities.map((modality, index) => (
            <Area
              key={modality}
              type="monotone"
              dataKey={modality}
              stackId="1"
              stroke={getModalityColor(modality, index)}
              fill={getModalityColor(modality, index)}
              fillOpacity={0.6}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}