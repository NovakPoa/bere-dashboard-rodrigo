import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type SeriesRow = Record<string, number | string>;

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

  return (
    <ChartContainer config={config} className="w-full">
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dia" />
        <YAxis tickFormatter={(v) => `${v}`}/>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        {modalities.map((m, i) => (
          <Bar key={m} dataKey={m} stackId="a" fill={colors[i % colors.length]} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
