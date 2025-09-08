import { useMemo, useState, useEffect, useRef } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { filterIncomes, filterIncomesByDateRange } from "@/lib/income";
import type { Income, IncomeCategory } from "@/types/income";

interface IncomesMonthlyChartProps {
  incomes: Income[];
  categories: string[];
}

interface ChartData {
  mes: string;
  ganhos: number;
}

export default function IncomesMonthlyChart({ incomes, categories }: IncomesMonthlyChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return subMonths(new Date(), 12);
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (categories.length > 0 && !hasInitialized.current) {
      setSelectedCategories(categories);
      hasInitialized.current = true;
    }
  }, [categories]);

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const filteredByDate = filterIncomesByDateRange(incomes, startDate, endDate);
    const filteredIncomes = filterIncomes(filteredByDate, {
      category: selectedCategories.length > 0 ? selectedCategories as IncomeCategory[] : "all",
      method: "all",
      description: ""
    });
    
    // Agregar ganhos por mês
    const monthlyData: Record<string, number> = {};
    
    filteredIncomes.forEach((income) => {
      const incomeDate = new Date(income.date + 'T00:00:00');
      const monthKey = format(incomeDate, "yyyy-MM");
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + income.amount;
    });

    // Converter para array e ordenar por data
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, ganhos]) => ({
        mes: format(new Date(monthKey + "-01"), "MMM/yy", { locale: ptBR }),
        ganhos,
      }));
  }, [incomes, startDate, endDate, selectedCategories]);

  const categoryOptions = useMemo(() => 
    categories.map(category => ({ value: category, label: category })),
    [categories]
  );

  const currency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-popover-foreground">{`${label}`}</p>
          <p className="text-sm text-muted-foreground">
            Ganhos: <span className="font-medium text-success">{currency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 pb-4">
        <CardTitle className="text-base font-medium">Ganhos por Mês</CardTitle>
        <div className="flex flex-col lg:flex-row gap-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <div className="w-full lg:w-80">
            <MultiSelect
              options={categoryOptions}
              selected={selectedCategories}
              onSelectionChange={setSelectedCategories}
              placeholder="Todas as categorias"
              label="Categorias"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                <Bar 
                  dataKey="ganhos" 
                  fill="hsl(var(--org-green))"
                  className="fill-success"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Nenhum ganho encontrado no período selecionado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}