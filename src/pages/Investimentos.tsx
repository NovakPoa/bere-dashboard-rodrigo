import { useState, useMemo } from "react";
import { Investment, InvestmentType, Broker } from "@/types/investment";
import { useInvestments } from "@/hooks/useInvestments";
import { AddInvestmentForm } from "@/components/investments/AddInvestmentForm";
import { InvestmentsTable } from "@/components/investments/InvestmentsTable";
import { TypeChart } from "@/components/investments/TypeChart";
import { BrokerChart } from "@/components/investments/BrokerChart";
import { StatCard } from "@/components/investments/StatCard";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus, TrendingUp, Wallet, Target, PieChart } from "lucide-react";
import { 
  filterInvestments, 
  filterInvestmentsByDateRange, 
  getPortfolioTotals,
  currency, 
  percentage,
  INVESTMENT_TYPE_LABELS,
  BROKER_LABELS 
} from "@/lib/investments";
import { toast } from "sonner";

export default function Investimentos() {
  const { data: investments = [], isLoading, error, refetch } = useInvestments();
  
  const [selectedTypes, setSelectedTypes] = useState<InvestmentType[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<Broker[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [showForm, setShowForm] = useState(false);

  const handleInvestmentAdded = () => {
    refetch();
    setShowForm(false);
    toast.success("Investimento adicionado com sucesso!");
  };

  // Filtragem de dados
  const filteredByDate = useMemo(() => {
    return filterInvestmentsByDateRange(investments, startDate, endDate);
  }, [investments, startDate, endDate]);

  const filtered = useMemo(() => {
    return filterInvestments(filteredByDate, {
      type: selectedTypes.length > 0 ? selectedTypes : "all",
      broker: selectedBrokers.length > 0 ? selectedBrokers : "all",
    });
  }, [filteredByDate, selectedTypes, selectedBrokers]);

  // Cálculos do portfólio
  const portfolioTotals = useMemo(() => {
    return getPortfolioTotals(filtered);
  }, [filtered]);

  // Opções para filtros
  const typesList = Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[];
  const typeOptions = typesList.map((type) => ({
    label: INVESTMENT_TYPE_LABELS[type],
    value: type,
  }));

  const brokersList = Object.keys(BROKER_LABELS) as Broker[];
  const brokerOptions = brokersList.map((broker) => ({
    label: BROKER_LABELS[broker],
    value: broker,
  }));

  if (isLoading) {
    return <div className="p-4">Carregando investimentos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Erro ao carregar investimentos</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie seu portfólio de investimentos
          </p>
        </div>

        <Drawer open={showForm} onOpenChange={setShowForm}>
          <DrawerTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Investimento
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh]">
            <div className="mx-auto w-full max-w-2xl p-4">
              <AddInvestmentForm onAdded={handleInvestmentAdded} />
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="py-4 md:py-8 space-y-6 md:space-y-8 max-w-full overflow-x-hidden">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <MultiSelect
                options={typeOptions}
                selected={selectedTypes}
                onSelectionChange={(selected) => setSelectedTypes(selected as InvestmentType[])}
                placeholder="Filtrar por tipo"
              />
            </div>
            <div className="min-w-0 flex-1">
              <MultiSelect
                options={brokerOptions}
                selected={selectedBrokers}
                onSelectionChange={(selected) => setSelectedBrokers(selected as Broker[])}
                placeholder="Filtrar por corretora"
              />
            </div>
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Investido"
            value={currency(portfolioTotals.totalInvestido)}
            icon={Wallet}
          />
          <StatCard
            title="Valor Atual"
            value={currency(portfolioTotals.valorAtual)}
            icon={TrendingUp}
          />
          <StatCard
            title="Rentabilidade"
            value={currency(portfolioTotals.rentabilidadeAbsoluta)}
            icon={Target}
            trend={{
              value: percentage(portfolioTotals.rentabilidadePercentual),
              isPositive: portfolioTotals.rentabilidadeAbsoluta >= 0,
            }}
          />
          <StatCard
            title="Quantidade"
            value={portfolioTotals.quantidadeInvestimentos.toString()}
            icon={PieChart}
          />
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          <TypeChart investments={filtered} />
          <BrokerChart investments={filtered} />
        </div>

        {/* Tabela de Investimentos */}
        <InvestmentsTable 
          investments={filtered} 
          onChange={() => refetch()}
        />
      </main>
    </div>
  );
}