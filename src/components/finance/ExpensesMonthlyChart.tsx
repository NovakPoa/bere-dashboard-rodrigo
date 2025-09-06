import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateRangePicker from "./DateRangePicker";
import { filterExpensesByDateRange } from "@/lib/finance";
import type { Expense } from "@/types/expense";

interface ExpensesMonthlyChartProps {
  expenses: Expense[];
}

interface ChartData {
  mes: string;
  despesas: number;
}

export default function ExpensesMonthlyChart({ expenses }: ExpensesMonthlyChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return subMonths(new Date(), 12);
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const filteredExpenses = filterExpensesByDateRange(expenses, startDate, endDate);
    
    // Agregar despesas por mês
    const monthlyData: Record<string, number> = {};
    
    filteredExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.date + 'T00:00:00');
      const monthKey = format(expenseDate, "yyyy-MM");
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
    });

    // Converter para array e ordenar por data
    return Object.entries(monthlyData)
      .map(([monthKey, despesas]) => ({
        mes: format(new Date(monthKey + "-01"), "MMM/yy", { locale: ptBR }),
        despesas,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.mes.split('/').reverse().join('-') + '-01');
        const dateB = new Date(b.mes.split('/').reverse().join('-') + '-01');
        return dateA.getTime() - dateB.getTime();
      });
  }, [expenses, startDate, endDate]);

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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Despesas por Mês</CardTitle>
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