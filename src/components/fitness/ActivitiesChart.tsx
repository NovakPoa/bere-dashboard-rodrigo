import { Bar, ComposedChart, CartesianGrid, Legend, XAxis, YAxis, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type SeriesRow = Record<string, number | string> & {
  calorias_totais?: number;
  tmb?: number;
  calorias_atividades?: number;
};

export default function ActivitiesChart({ data, modalities }: { data: SeriesRow[]; modalities: string[] }) {
  const colors = [
    "hsl(var(--primary))",
    "hsl(200 80% 55%)",
    "hsl(140 55% 45%)",
    "hsl(280 60% 60%)",
    "hsl(45 80% 55%)",
  ];

  const config = modalities.reduce((acc, m, i) => {
    acc[m] = { label: m, color: colors[i % colors.length] } as any;
    return acc;
  }, {} as any);

  // Add calorie line config
  config.calorias_totais = { 
    label: "Gasto Calórico Total", 
    color: "hsl(var(--destructive))"
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{`Dia: ${label}`}</p>
          {modalities.map((m) => (
            data[m] > 0 && (
              <p key={m} className="text-xs text-muted-foreground">
                <span className="font-medium capitalize">{m}:</span> {data[m]} min
              </p>
            )
          ))}
          {data.calorias_totais && (
            <>
              <div className="border-t border-border mt-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">TMB:</span> {data.tmb || 0} kcal
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Atividades:</span> {data.calorias_atividades || 0} kcal
                </p>
                <p className="text-xs font-medium text-destructive">
                  <span>Total:</span> {data.calorias_totais} kcal
                </p>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer config={config} className="w-full h-full">
      <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="dia" 
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          yAxisId="minutes"
          orientation="left"
          tickFormatter={(v) => `${v}m`}
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          yAxisId="calories"
          orientation="right"
          tickFormatter={(v) => `${v}kcal`}
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        {modalities.map((m, i) => (
          <Bar 
            key={m} 
            dataKey={m} 
            stackId="a" 
            fill={colors[i % colors.length]} 
            yAxisId="minutes"
          />
        ))}
        <Line 
          type="monotone" 
          dataKey="calorias_totais" 
          stroke="hsl(var(--destructive))" 
          strokeWidth={2}
          yAxisId="calories"
          dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 3 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
