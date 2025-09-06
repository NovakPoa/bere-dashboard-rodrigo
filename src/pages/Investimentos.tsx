import { useState, useMemo } from "react";
import { Investment } from "@/types/investment";
import { useInvestments, useExchangeRate } from "@/hooks/useInvestments";
import { AddInvestmentForm } from "@/components/investments/AddInvestmentForm";
import { InvestmentsTable } from "@/components/investments/InvestmentsTable";
import { TypeChart } from "@/components/investments/TypeChart";
import { BrokerChart } from "@/components/investments/BrokerChart";
import { CurrencyChart } from "@/components/investments/CurrencyChart";
import { RentabilityChart } from "@/components/investments/RentabilityChart";
import { RentabilityFilters } from "@/components/investments/RentabilityFilters";
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
  
  // Estados para o gráfico de rentabilidade
  const [rentabilityPeriod, setRentabilityPeriod] = useState<"7days" | "month" | "year">("month");
  const [selectedRentabilityNames, setSelectedRentabilityNames] = useState<string[]>([]);
  const [selectedRentabilityTypes, setSelectedRentabilityTypes] = useState<string[]>([]);
  const [showRentabilityValue, setShowRentabilityValue] = useState(true);

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
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <MultiSelect
              options={typeOptions}
              selected={selectedTypes}
              onSelectionChange={(selected) => setSelectedTypes(selected as string[])}
              placeholder="Filtrar por tipo"
              className="min-w-48"
            />
            <MultiSelect
              options={brokerOptions}
              selected={selectedBrokers}
              onSelectionChange={(selected) => setSelectedBrokers(selected as string[])}
              placeholder="Filtrar por corretora"
              className="min-w-44"
            />
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
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

        {/* Gráfico de Rentabilidade no Tempo */}
        <div className="space-y-4">
          <RentabilityFilters
            investments={investments}
            selectedPeriod={rentabilityPeriod}
            onPeriodChange={setRentabilityPeriod}
            selectedNames={selectedRentabilityNames}
            onNamesChange={setSelectedRentabilityNames}
            selectedTypes={selectedRentabilityTypes}
            onTypesChange={setSelectedRentabilityTypes}
            showValue={showRentabilityValue}
            onToggleDisplay={() => setShowRentabilityValue(!showRentabilityValue)}
          />
          <RentabilityChart
            investments={investments}
            selectedPeriod={rentabilityPeriod}
            selectedNames={selectedRentabilityNames}
            selectedTypes={selectedRentabilityTypes}
            showValue={showRentabilityValue}
          />
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