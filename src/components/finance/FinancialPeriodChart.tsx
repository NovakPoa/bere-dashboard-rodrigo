import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import DateRangePicker from "./DateRangePicker";
import { filterExpensesByDateRange } from "@/lib/finance";
import { filterIncomesByDateRange } from "@/lib/income";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialPeriodChartProps {
  expenses: Expense[];
  incomes: Income[];
}

interface ChartData {
  date: string;
  despesas: number;
  ganhos: number;
  saldo: number;
}

export default function FinancialPeriodChart({ expenses, incomes }: FinancialPeriodChartProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
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
      const dateKey = format(new Date(expense.date), "yyyy-MM-dd");
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = {
          date: format(new Date(expense.date), "dd/MM", { locale: ptBR }),
          despesas: 0,
          ganhos: 0,
          saldo: 0
        };
      }
      dataMap[dateKey].despesas += expense.amount;
    });

    // Adicionar ganhos
    filteredIncomes.forEach((income) => {
      const dateKey = format(new Date(income.date), "yyyy-MM-dd");
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = {
          date: format(new Date(income.date), "dd/MM", { locale: ptBR }),
          despesas: 0,
          ganhos: 0,
          saldo: 0
        };
      }
      dataMap[dateKey].ganhos += income.amount;
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
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
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
              <Line 
                type="monotone" 
                dataKey="ganhos" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Ganhos"
                dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Despesas"
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Saldo"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
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