import { useState, useMemo } from "react";
import { Investment } from "@/types/investment";
import { useInvestments, useExchangeRate } from "@/hooks/useInvestments";
import { AddInvestmentForm } from "@/components/investments/AddInvestmentForm";
import { InvestmentsTable } from "@/components/investments/InvestmentsTable";
import { TypeChart } from "@/components/investments/TypeChart";
import { BrokerChart } from "@/components/investments/BrokerChart";
import { CurrencyChart } from "@/components/investments/CurrencyChart";
import InvestmentsMonthlyChart from "@/components/investments/InvestmentsMonthlyChart";
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
  percentage 
} from "@/lib/investments";
import { formatExchangeRate } from "@/lib/currency";
import { toast } from "sonner";

export default function Investimentos() {
  const { data: investments = [], isLoading, error, refetch } = useInvestments();
  const { data: exchangeRate = 5.0 } = useExchangeRate();
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
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
    return getPortfolioTotals(filtered, exchangeRate);
  }, [filtered, exchangeRate]);

  // Opções para filtros - buscar valores únicos dos investimentos
  const typeOptions = useMemo(() => {
    const uniqueTypes = [...new Set(investments.map(inv => inv.tipo_investimento))].filter(Boolean);
    return uniqueTypes.map(type => ({
      label: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
      value: type,
    }));
  }, [investments]);

  const brokerOptions = useMemo(() => {
    const uniqueBrokers = [...new Set(investments.map(inv => inv.corretora))].filter(Boolean);
    return uniqueBrokers.map(broker => ({
      label: broker.charAt(0).toUpperCase() + broker.slice(1).toLowerCase(),
      value: broker,
    }));
  }, [investments]);

  if (isLoading) {
    return <div className="p-4">Carregando investimentos...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Erro ao carregar investimentos</div>;
  }

  return (
    <div className="space-y-6">
      <header className="py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Investimentos</h1>

        <Drawer open={showForm} onOpenChange={setShowForm}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
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
        <div className="space-y-4">
          {/* Primeira linha - DateRangePicker */}
          <div className="min-w-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
          
          {/* Segunda linha - Grid 2 colunas */}
          <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <MultiSelect
                options={typeOptions}
                selected={selectedTypes}
                onSelectionChange={(selected) => setSelectedTypes(selected as string[])}
                placeholder="Filtrar por tipo"
              />
            </div>
            <div className="min-w-0">
              <MultiSelect
                options={brokerOptions}
                selected={selectedBrokers}
                onSelectionChange={(selected) => setSelectedBrokers(selected as string[])}
                placeholder="Filtrar por corretora"
              />
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>

        {/* Indicador de Cotação */}
        <div className="text-sm text-muted-foreground text-center">
          Cotação USD/BRL: {formatExchangeRate(exchangeRate)}
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TypeChart investments={filtered} exchangeRate={exchangeRate} />
          <BrokerChart investments={filtered} exchangeRate={exchangeRate} />
          <CurrencyChart investments={filtered} exchangeRate={exchangeRate} />
        </div>

        {/* Gráfico de Investimentos por Mês */}
        <InvestmentsMonthlyChart 
          investments={investments} 
          exchangeRate={exchangeRate}
        />

        {/* Tabela de Investimentos */}
        <InvestmentsTable 
          investments={filtered} 
          onChange={() => refetch()}
        />
      </main>
    </div>
  );
}