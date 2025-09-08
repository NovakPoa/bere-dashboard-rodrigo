import { useMemo, useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker from "./DateRangePicker";
import { filterExpensesByDateRange, filterExpenses } from "@/lib/finance";
import type { Expense, Category } from "@/types/expense";

interface ExpensesMonthlyChartProps {
  expenses: Expense[];
  categories: Category[];
}

interface ChartData {
  mes: string;
  despesas: number;
}

export default function ExpensesMonthlyChart({ expenses, categories }: ExpensesMonthlyChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return subMonths(new Date(), 12);
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Initialize with all categories selected
  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories);
    }
  }, [categories, selectedCategories.length]);

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const filteredByDate = filterExpensesByDateRange(expenses, startDate, endDate);
    const filteredExpenses = filterExpenses(filteredByDate, {
      category: selectedCategories.length > 0 ? selectedCategories : "all",
    });
    
    // Agregar despesas por mês
    const monthlyData: Record<string, number> = {};
    
    filteredExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date + 'T00:00:00');
      const monthKey = format(expenseDate, "yyyy-MM");
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
    });

    // Converter para array e ordenar por data
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, despesas]) => ({
        mes: format(new Date(monthKey + "-01"), "MMM/yy", { locale: ptBR }),
        despesas,
      }));
  }, [expenses, startDate, endDate, selectedCategories]);

  const currency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-popover-foreground">{`${label}`}</p>
          <p className="text-sm text-muted-foreground">
            Despesas: <span className="font-medium text-destructive">{currency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const categoryOptions = useMemo(() => 
    categories.map(cat => ({ 
      label: cat.charAt(0).toUpperCase() + cat.slice(1), 
      value: cat 
    })), 
    [categories]
  );

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 pb-2">
        <CardTitle className="text-base font-medium">Despesas por Mês</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-64 min-w-0">
            <MultiSelect
              options={categoryOptions}
              selected={selectedCategories}
              onSelectionChange={(selected) => setSelectedCategories(selected as Category[])}
              placeholder="Todas as categorias"
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
                  dataKey="despesas" 
                  fill="hsl(var(--destructive))"
                  className="fill-destructive"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Nenhuma despesa encontrada no período selecionado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}