import { useMemo, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import DateRangePicker from "./DateRangePicker";
import { filterExpensesByDateRange } from "@/lib/finance";
import { filterIncomesByDateRange } from "@/lib/income";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateFromDatabase } from "@/lib/utils";
interface FinancialPeriodChartProps {
  expenses: Expense[];
  incomes: Income[];
}

interface ChartData {
  mes: string;
  despesas: number;
  ganhos: number;
  saldo: number;
}

export default function FinancialPeriodChart({ expenses, incomes }: FinancialPeriodChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    return subMonths(new Date(), 12);
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const filteredExpenses = filterExpensesByDateRange(expenses, startDate, endDate);
    const filteredIncomes = filterIncomesByDateRange(incomes, startDate, endDate);

    // Criar um mapa de dados por data
    const dataMap: Record<string, ChartData> = {};

    // Adicionar despesas
    filteredExpenses.forEach((expense) => {
      const monthKey = format(parseDateFromDatabase(expense.date), "yyyy-MM");
      if (!dataMap[monthKey]) {
        dataMap[monthKey] = {
          mes: format(parseDateFromDatabase(expense.date), "MMM/yy", { locale: ptBR }),
          despesas: 0,
          ganhos: 0,
          saldo: 0
        };
      }
      dataMap[monthKey].despesas += expense.amount;
    });

    // Adicionar ganhos
    filteredIncomes.forEach((income) => {
      const monthKey = format(parseDateFromDatabase(income.date), "yyyy-MM");
      if (!dataMap[monthKey]) {
        dataMap[monthKey] = {
          mes: format(parseDateFromDatabase(income.date), "MMM/yy", { locale: ptBR }),
          despesas: 0,
          ganhos: 0,
          saldo: 0
        };
      }
      dataMap[monthKey].ganhos += income.amount;
    });

    // Calcular saldo e ordenar por data
    const sortedData = Object.entries(dataMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({
        ...data,
        saldo: data.ganhos - data.despesas
      }));

    return sortedData;
  }, [expenses, incomes, startDate, endDate]);

  const currency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{`Data: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${currency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="transition-smooth hover:shadow-elegant">
      <CardHeader className="space-y-4">
        <CardTitle className="text-base md:text-lg font-medium">
          Ganhos vs Despesas por Período
        </CardTitle>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="mes" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={currency}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="ganhos" 
                fill="hsl(var(--org-green))" 
                name="Ganhos"
              />
              <Bar 
                dataKey="despesas" 
                fill="hsl(var(--org-red))" 
                name="Despesas"
              />
              <Line 
                type="monotone"
                dataKey="saldo" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 2, r: 5 }}
                name="Saldo"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Nenhum dado encontrado para o período selecionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}