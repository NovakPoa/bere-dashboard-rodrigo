import { useEffect, useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getExpenses, filterExpenses, filterExpensesByDateRange, getMonthlyTotal } from "@/lib/finance";
import type { Category, PaymentMethod } from "@/types/expense";
import StatCard from "@/components/finance/StatCard";
import AddExpenseFromMessage from "@/components/finance/AddExpenseFromMessage";
import CategoryChart from "@/components/finance/CategoryChart";
import MethodChart from "@/components/finance/MethodChart";
import ExpensesTable from "@/components/finance/ExpensesTable";
import DateRangePicker from "@/components/finance/DateRangePicker";

const Index = () => {
  const [expenses, setExpenses] = useState(() => getExpenses());
  const [category, setCategory] = useState<"all" | Category>("all");
  const [method, setMethod] = useState<"all" | PaymentMethod>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const refresh = () => setExpenses(getExpenses());

  useEffect(() => {
    // Initial load from localStorage
    setExpenses(getExpenses());
  }, []);

  useEffect(() => {
    document.title = "Financeiro";
  }, []);

  const filteredByDate = useMemo(() => 
    filterExpensesByDateRange(expenses, startDate, endDate), 
    [expenses, startDate, endDate]
  );
  
  const filtered = useMemo(() => 
    filterExpenses(filteredByDate, { category, method }), 
    [filteredByDate, category, method]
  );
  
  const totalInPeriod = useMemo(() => 
    filteredByDate.reduce((sum, e) => sum + e.amount, 0), 
    [filteredByDate]
  );
  
  const totalThisMonth = useMemo(() => getMonthlyTotal(expenses), [expenses]);
  const categoriesList = useMemo(() => Array.from(new Set(expenses.map((e) => e.category))).sort(), [expenses]);
  const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen">
      <header className="container py-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Financeiro</h1>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="filters" className="space-y-6">
          <h2 id="filters" className="sr-only">Filtros</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categoriesList.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="capitalize">{c}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Forma de pagamento</label>
                <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Todas as formas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </section>

        <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="stats" className="sr-only">Métricas principais</h2>
          <StatCard title="Gasto no Período" value={currency(totalInPeriod)} />
          <StatCard title="Gasto no Mês" value={currency(totalThisMonth)} />
          <StatCard title="Total de Transações" value={String(filteredByDate.length)} />
          <StatCard 
            title="Ticket Médio no Período" 
            value={filteredByDate.length ? currency(totalInPeriod / filteredByDate.length) : "-"} 
          />
        </section>

        <section aria-labelledby="add-message">
          <h2 id="add-message" className="sr-only">Adicionar despesa por mensagem</h2>
          <AddExpenseFromMessage onAdded={refresh} />
        </section>

        <section aria-labelledby="charts" className="grid gap-6 md:grid-cols-2">
          <h2 id="charts" className="sr-only">Gráficos de distribuição</h2>
          <CategoryChart expenses={filtered} />
          <MethodChart expenses={filtered} />
        </section>

        <Separator />

        <section aria-labelledby="list">
          <h2 id="list" className="text-lg font-medium mb-3">Despesas</h2>
          <ExpensesTable 
            expenses={filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())} 
            onChange={refresh} 
          />
        </section>
      </main>
    </div>
  );
};

export default Index;
