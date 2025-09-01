import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Plus } from "lucide-react";
import { filterExpenses, filterExpensesByDateRange } from "@/lib/finance";
import type { Category, PaymentMethod } from "@/types/expense";
import StatCard from "@/components/finance/StatCard";
import AddExpenseFromMessage from "@/components/finance/AddExpenseFromMessage";
import CategoryChart from "@/components/finance/CategoryChart";
import MethodChart from "@/components/finance/MethodChart";
import ExpensesTable from "@/components/finance/ExpensesTable";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { useExpenses } from "@/hooks/useFinance";

const Index = () => {
  const { data: expenses = [], refetch } = useExpenses();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const refresh = () => refetch();
  
  const handleExpenseAdded = () => {
    refresh();
    setShowExpenseForm(false);
  };

  useEffect(() => {
    document.title = "Financeiro";
  }, []);

  const filteredByDate = useMemo(() => 
    filterExpensesByDateRange(expenses, startDate, endDate), 
    [expenses, startDate, endDate]
  );
  
  const filtered = useMemo(() => 
    filterExpenses(filteredByDate, { 
      category: selectedCategories.length > 0 ? selectedCategories : "all",
      method: selectedMethods.length > 0 ? selectedMethods : "all" 
    }), 
    [filteredByDate, selectedCategories, selectedMethods]
  );
  
  const totalFiltered = useMemo(() => 
    filtered.reduce((sum, e) => sum + e.amount, 0), 
    [filtered]
  );
  
  const categoriesList = useMemo(() => Array.from(new Set(expenses.map((e) => e.category))).sort(), [expenses]);
  
  const categoryOptions = useMemo(() => 
    categoriesList.map(cat => ({ 
      label: cat.charAt(0).toUpperCase() + cat.slice(1), 
      value: cat 
    })), 
    [categoriesList]
  );
  
  const methodOptions = [
    { label: "PIX", value: "pix" },
    { label: "Boleto", value: "boleto" },
    { label: "Crédito", value: "credit" }
  ];

  const handleCategoryChange = (selected: string[]) => {
    setSelectedCategories(selected as Category[]);
  };

  const handleMethodChange = (selected: string[]) => {
    setSelectedMethods(selected as PaymentMethod[]);
  };

  const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <header className="py-4 md:py-6 flex justify-between items-center">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Financeiro</h1>
        <Drawer open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Nova Despesa</DrawerTitle>
            </DrawerHeader>
            <div className="px-6 pb-6">
              <AddExpenseFromMessage onAdded={handleExpenseAdded} />
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="py-4 md:py-8 space-y-6 md:space-y-8 max-w-full overflow-x-hidden">
        <section aria-labelledby="filters" className="space-y-4 md:space-y-6 min-w-0">
          <h2 id="filters" className="sr-only">Filtros</h2>
          <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
            <div className="flex flex-col md:flex-row gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <MultiSelect
                  label="Categoria"
                  options={categoryOptions}
                  selected={selectedCategories}
                  onSelectionChange={handleCategoryChange}
                  placeholder="Todas as categorias"
                />
              </div>
              <div className="flex-1 min-w-0">
                <MultiSelect
                  label="Forma de pagamento"
                  options={methodOptions}
                  selected={selectedMethods}
                  onSelectionChange={handleMethodChange}
                  placeholder="Todas as formas"
                />
              </div>
            </div>
            <div className="min-w-0">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
          <h2 id="stats" className="sr-only">Métricas principais</h2>
          <StatCard title="Despesas" value={currency(totalFiltered)} />
          <StatCard title="Total de Transações" value={String(filtered.length)} />
          <StatCard 
            title="Ticket Médio"
            value={filtered.length ? currency(totalFiltered / filtered.length) : "-"} 
          />
        </section>


        <section aria-labelledby="charts" className="grid gap-4 md:gap-6 md:grid-cols-2 min-w-0">
          <h2 id="charts" className="sr-only">Gráficos de distribuição</h2>
          <div className="min-w-0">
            <CategoryChart expenses={filtered} />
          </div>
          <div className="min-w-0">
            <MethodChart expenses={filtered} />
          </div>
        </section>

        <Separator />

        <section aria-labelledby="list" className="min-w-0">
          <h2 id="list" className="text-lg font-medium mb-3">Despesas</h2>
          <div className="min-w-0">
            <ExpensesTable 
              expenses={filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())} 
              onChange={refresh} 
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
