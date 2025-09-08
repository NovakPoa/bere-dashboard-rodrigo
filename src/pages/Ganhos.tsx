import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import DateRangePicker from "@/components/finance/DateRangePicker";
import StatCard from "@/components/finance/StatCard";
import CategoryChart from "@/components/income/CategoryChart";
import MethodChart from "@/components/income/MethodChart";
import IncomesMonthlyChart from "@/components/income/IncomesMonthlyChart";
import IncomesTable from "@/components/income/IncomesTable";
import AddIncomeForm from "@/components/income/AddIncomeForm";
import { useIncomes } from "@/hooks/useIncome";
import { useIncomeCategories } from "@/hooks/useCategories";
import { filterIncomes, filterIncomesByDateRange } from "@/lib/income";
import type { IncomeCategory, PaymentMethod } from "@/types/income";

const methodOptions = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "boleto", label: "Boleto" }
];

export default function Ganhos() {
  const { data: incomes = [], refetch } = useIncomes();
  const { data: userCategories = [] } = useIncomeCategories();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  const handleIncomeAdded = () => {
    refetch();
    setShowIncomeForm(false);
  };

  useEffect(() => {
    document.title = "Ganhos";
  }, []);

  const filteredByDate = useMemo(() => 
    filterIncomesByDateRange(incomes, startDate, endDate), 
    [incomes, startDate, endDate]
  );

  const filtered = useMemo(() => 
    filterIncomes(filteredByDate, {
      category: selectedCategories.length > 0 ? selectedCategories as IncomeCategory[] : "all",
      method: selectedMethods.length > 0 ? selectedMethods as PaymentMethod[] : "all",
      description: descriptionFilter
    }), 
    [filteredByDate, selectedCategories, selectedMethods, descriptionFilter]
  );

  const totalFiltered = useMemo(() => 
    filtered.reduce((sum, income) => sum + income.amount, 0), 
    [filtered]
  );

  const categoryOptions = useMemo(() => 
    userCategories.map(category => ({ value: category, label: category })),
    [userCategories]
  );

  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <header className="py-4 md:py-6 flex justify-between items-center">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Ganhos</h1>
        <Drawer open={showIncomeForm} onOpenChange={setShowIncomeForm}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <AddIncomeForm onAdded={handleIncomeAdded} />
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="py-4 md:py-8 space-y-6 md:space-y-8 max-w-full overflow-x-hidden">
        {/* Filters */}
        <div className="space-y-3 md:space-y-4 min-w-0">
          <div className="min-w-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
          <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-3 min-w-0">
            <div className="min-w-0">
              <Label htmlFor="description-filter">Descrição</Label>
              <Input
                id="description-filter"
                type="text"
                placeholder="Filtrar por descrição..."
                value={descriptionFilter}
                onChange={(e) => setDescriptionFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <MultiSelect
                options={categoryOptions}
                selected={selectedCategories}
                onSelectionChange={setSelectedCategories}
                placeholder="Todas as categorias"
                label="Categorias"
              />
            </div>
            <div className="min-w-0">
              <MultiSelect
                options={methodOptions}
                selected={selectedMethods}
                onSelectionChange={setSelectedMethods}
                placeholder="Todos os métodos"
                label="Métodos"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            title="Total de Ganhos"
            value={currency(totalFiltered)}
          />
          <StatCard
            title="Número de Entradas"
            value={filtered.length.toString()}
          />
          <StatCard
            title="Entrada Média"
            value={filtered.length > 0 ? currency(totalFiltered / filtered.length) : currency(0)}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <CategoryChart incomes={filtered} />
          <MethodChart incomes={filtered} />
        </div>

        {/* Monthly Chart */}
        <IncomesMonthlyChart incomes={incomes} />

        {/* Table */}
        <IncomesTable 
          incomes={filtered} 
          onChange={() => refetch()}
        />
      </main>
    </div>
  );
}