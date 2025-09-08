import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { Investment } from "@/types/investment";
import { convertToReais } from "@/lib/currency";

interface InvestmentsMonthlyChartProps {
  investments: Investment[];
  exchangeRate: number;
}

interface ChartData {
  mes: string;
  valorInvestido: number;
  valorAtual: number;
  rentabilidade: number;
}

export default function InvestmentsMonthlyChart({ investments, exchangeRate }: InvestmentsMonthlyChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return subMonths(new Date(), 12);
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    // Filtrar investimentos por período baseado na data_investimento
    const filteredInvestments = investments.filter((investment) => {
      const investmentDate = new Date(investment.data_investimento + 'T00:00:00');
      return investmentDate >= startDate && investmentDate <= endDate;
    });
    
    // Agregar investimentos por mês
    const monthlyData: Record<string, { valorInvestido: number; valorAtual: number; rentabilidade: number }> = {};
    
    filteredInvestments.forEach((investment) => {
      const investmentDate = new Date(investment.data_investimento + 'T00:00:00');
      const monthKey = format(investmentDate, "yyyy-MM");
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { valorInvestido: 0, valorAtual: 0, rentabilidade: 0 };
      }
      
      const valorInvestidoBRL = convertToReais(investment.valor_total_investido, investment.moeda, exchangeRate);
      const valorAtualBRL = convertToReais(investment.valor_atual_total, investment.moeda, exchangeRate);
      const rentabilidadeBRL = convertToReais(investment.rentabilidade_absoluta, investment.moeda, exchangeRate);
      
      monthlyData[monthKey].valorInvestido += valorInvestidoBRL;
      monthlyData[monthKey].valorAtual += valorAtualBRL;
      monthlyData[monthKey].rentabilidade += rentabilidadeBRL;
    });

    // Converter para array e ordenar por data
    return Object.entries(monthlyData)
      .map(([monthKey, data]) => ({
        mes: format(new Date(monthKey + "-01"), "MMM/yy", { locale: ptBR }),
        valorInvestido: data.valorInvestido,
        valorAtual: data.valorAtual,
        rentabilidade: data.rentabilidade,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.mes.split('/').reverse().join('-') + '-01');
        const dateB = new Date(b.mes.split('/').reverse().join('-') + '-01');
        return dateA.getTime() - dateB.getTime();
      });
  }, [investments, startDate, endDate, exchangeRate]);

  const currency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-popover-foreground">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
                {currency(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Investimentos por Mês</CardTitle>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="mes" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => 
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value)
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="valorInvestido" 
                  fill="hsl(var(--chart-1))"
                  name="Valor Investido"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="valorAtual" 
                  fill="hsl(var(--org-green))"
                  name="Valor Atual"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="rentabilidade" 
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  name="Rentabilidade"
                  dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Nenhum investimento encontrado no período selecionado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}