import { useMemo, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Investment } from "@/types/investment";
import { InvestmentSnapshot } from "@/types/investment-snapshot";
import { currency } from "@/lib/investments";

interface MonthlyProfitabilityChartProps {
  investments: Investment[];
  snapshots: InvestmentSnapshot[];
}

interface ChartData {
  mes: string;
  [key: string]: string | number; // Dynamic keys for each investment
}

export function MonthlyProfitabilityChart({
  investments,
  snapshots,
}: MonthlyProfitabilityChartProps) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const hasInitialized = useRef(false);

  // Create investment name mapping
  const investmentMap = useMemo(() => {
    const map = new Map<string, string>();
    investments.forEach(inv => {
      map.set(inv.id, inv.nome_investimento);
    });
    return map;
  }, [investments]);

  // Get unique investment names
  const uniqueNames = useMemo(() => {
    return [...new Set(investments.map(inv => inv.nome_investimento))].filter(Boolean);
  }, [investments]);

  useEffect(() => {
    if (uniqueNames.length > 0 && !hasInitialized.current) {
      setSelectedNames(uniqueNames.slice(0, 5)); // Start with first 5 investments
      hasInitialized.current = true;
    }
  }, [uniqueNames]);

  const chartData = useMemo(() => {
    if (selectedNames.length === 0 || snapshots.length === 0) return [];

    // Filter investments by selected names
    const selectedInvestmentIds = investments
      .filter(inv => selectedNames.includes(inv.nome_investimento))
      .map(inv => inv.id);

    // Filter snapshots for selected investments
    const filteredSnapshots = snapshots.filter(snapshot => 
      selectedInvestmentIds.includes(snapshot.investment_id)
    );

    // Group snapshots by month
    const monthlyData = new Map<string, Map<string, number>>();

    filteredSnapshots.forEach(snapshot => {
      const month = format(new Date(snapshot.snapshot_date), "MMM/yyyy", { locale: ptBR });
      const investmentName = investmentMap.get(snapshot.investment_id) || "Desconhecido";
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, new Map());
      }
      
      const monthData = monthlyData.get(month)!;
      const currentValue = monthData.get(investmentName) || 0;
      monthData.set(investmentName, currentValue + snapshot.valor_total_brl);
    });

    // Convert to chart format and sort by date
    const chartDataArray: ChartData[] = Array.from(monthlyData.entries())
      .map(([month, investmentValues]) => {
        const dataPoint: ChartData = { mes: month };
        investmentValues.forEach((value, investmentName) => {
          dataPoint[investmentName] = value;
        });
        return dataPoint;
      })
      .sort((a, b) => {
        // Sort by date (convert back to date for proper sorting)
        const dateA = new Date(a.mes.split("/").reverse().join("-"));
        const dateB = new Date(b.mes.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
      });

    return chartDataArray;
  }, [snapshots, selectedNames, investments, investmentMap]);

  const nameOptions = useMemo(() => 
    uniqueNames.map(name => ({ value: name, label: name })),
    [uniqueNames]
  );

  // Generate colors for the lines
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#0088fe",
    "#ff8042",
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {currency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (snapshots.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base font-medium">Rentabilidade Mensal por Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Nenhum snapshot encontrado</p>
              <p className="text-sm">Crie snapshots mensais para acompanhar a evolução dos seus investimentos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 pb-4">
        <CardTitle className="text-base font-medium">Rentabilidade Mensal por Snapshots</CardTitle>
        <div className="w-full lg:w-80">
          <MultiSelect
            options={nameOptions}
            selected={selectedNames}
            onSelectionChange={setSelectedNames}
            placeholder="Selecione investimentos"
            label="Investimentos"
          />
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Nenhum dado disponível para os investimentos selecionados</p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => currency(value).replace(/\.\d{2}$/, "")}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedNames.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}