
import { useMemo } from "react";
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FoodEntry = {
  descricao: string;
  refeicao: string;
  calorias: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  data: string;
};

interface NutritionChartsProps {
  entries: FoodEntry[];
  dateRange?: { from: Date; to: Date };
}

export default function NutritionCharts({ entries, dateRange }: NutritionChartsProps) {
  const filteredEntries = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return entries;
    return entries.filter(entry => {
      const entryDate = new Date(entry.data);
      return entryDate >= dateRange.from && entryDate <= dateRange.to;
    });
  }, [entries, dateRange]);

  const dailyData = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      const date = format(new Date(entry.data), 'dd/MM', { locale: ptBR });
      if (!acc[date]) {
        acc[date] = {
          data: date,
          calorias: 0,
          proteinas: 0,
          carboidratos: 0,
          gorduras: 0,
          count: 0
        };
      }
      acc[date].calorias += entry.calorias;
      acc[date].proteinas += entry.proteinas_g;
      acc[date].carboidratos += entry.carboidratos_g;
      acc[date].gorduras += entry.gorduras_g;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => {
      const [dayA, monthA] = a.data.split('/').map(Number);
      const [dayB, monthB] = b.data.split('/').map(Number);
      return monthA - monthB || dayA - dayB;
    });
  }, [filteredEntries]);

  const averageData = useMemo(() => {
    if (dailyData.length === 0) return [];
    
    const totals = dailyData.reduce((acc: any, day: any) => {
      acc.calorias += day.calorias;
      acc.proteinas += day.proteinas;
      acc.carboidratos += day.carboidratos;
      acc.gorduras += day.gorduras;
      return acc;
    }, { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 });

    const days = dailyData.length;
    return [
      { nome: "Proteínas", valor: Math.round(totals.proteinas / days), unidade: "g" },
      { nome: "Carboidratos", valor: Math.round(totals.carboidratos / days), unidade: "g" },
      { nome: "Gorduras", valor: Math.round(totals.gorduras / days), unidade: "g" },
    ];
  }, [dailyData]);

  const avgCalories = useMemo(() => {
    if (dailyData.length === 0) return 0;
    const total = dailyData.reduce((acc: number, day: any) => acc + day.calorias, 0);
    return Math.round(total / dailyData.length);
  }, [dailyData]);

  const chartConfig = {
    calorias: { label: "Calorias", color: "hsl(var(--primary))" },
    proteinas: { label: "Proteínas", color: "hsl(200 80% 55%)" },
    carboidratos: { label: "Carboidratos", color: "hsl(140 55% 45%)" },
    gorduras: { label: "Gorduras", color: "hsl(280 60% 60%)" },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm text-muted-foreground">Média diária de macronutrientes</CardTitle>
          <p className="text-xs text-muted-foreground">
            Calorias médias/dia: <span className="font-medium text-foreground">{avgCalories} kcal</span>
          </p>
        </CardHeader>
        <CardContent className="h-64">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-lg">
                        <p className="font-medium">{data.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.valor} {data.unidade}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Variação de calorias por dia</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="calorias" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
