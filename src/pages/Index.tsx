import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getExpenses, filterExpenses, getMonthlyTotal } from "@/lib/finance";
import type { Category, PaymentMethod } from "@/types/expense";
import StatCard from "@/components/finance/StatCard";
import AddExpenseFromMessage from "@/components/finance/AddExpenseFromMessage";
import CategoryChart from "@/components/finance/CategoryChart";
import MethodChart from "@/components/finance/MethodChart";
import ExpensesTable from "@/components/finance/ExpensesTable";

const Index = () => {
  const [expenses, setExpenses] = useState(() => getExpenses());
  const [category, setCategory] = useState<"all" | Category>("all");
  const [method, setMethod] = useState<"all" | PaymentMethod>("all");

  const refresh = () => setExpenses(getExpenses());

  useEffect(() => {
    // Initial load from localStorage
    setExpenses(getExpenses());
  }, []);

  const filtered = useMemo(() => filterExpenses(expenses, { category, method }), [expenses, category, method]);
  const totalThisMonth = useMemo(() => getMonthlyTotal(expenses), [expenses]);

  const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">Painel de Finanças Pessoais</h1>
          <p className="text-primary-foreground/90 mt-2 max-w-2xl">
            Envie uma mensagem no WhatsApp com o valor, a categoria (restaurante, supermercado, combustível, aluguel, presentes) e a forma de pagamento (PIX, boleto, crédito). Cole aqui para simular.
          </p>
          <div className="mt-6">
            <Button variant="hero" className="transition-smooth">Ver opções de integração</Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="stats" className="sr-only">Métricas principais</h2>
          <StatCard title="Este mês" value={currency(totalThisMonth)} />
          <StatCard title="Transações" value={String(expenses.length)} />
          <StatCard title="Filtradas" value={String(filtered.length)} hint="De acordo com os filtros" />
          <StatCard title="Média (filtradas)" value={filtered.length ? currency(filtered.reduce((a, b) => a + b.amount, 0) / filtered.length) : "-"} />
        </section>

        <section aria-labelledby="add-message" className="grid gap-6 md:grid-cols-5">
          <h2 id="add-message" className="sr-only">Adicionar despesa por mensagem</h2>
          <div className="md:col-span-2">
            <AddExpenseFromMessage onAdded={refresh} />
          </div>
          <div className="md:col-span-3 grid gap-6 bg-secondary rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="assinaturas">Assinaturas</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="lazer">Lazer</SelectItem>
                    <SelectItem value="mercado">Mercado</SelectItem>
                    <SelectItem value="presentes">Presentes</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="utilidades">Utilidades</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
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
            <div className="grid gap-6 md:grid-cols-2">
              <CategoryChart expenses={filtered} />
              <MethodChart expenses={filtered} />
            </div>
          </div>
        </section>

        <Separator />

        <section aria-labelledby="list">
          <h2 id="list" className="text-lg font-medium mb-3">Despesas</h2>
          <ExpensesTable expenses={filtered} onChange={refresh} />
        </section>
      </main>
    </div>
  );
};

export default Index;
