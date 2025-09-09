import { useState, useMemo } from "react";
import { Investment } from "@/types/investment";
import { useInvestments, useExchangeRate } from "@/hooks/useInvestments";
import { useInvestmentPricesByRange } from "@/hooks/useInvestmentPriceHistory";
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
  getPeriodVariation,
  currency, 
  percentage 
} from "@/lib/investments";
import { formatExchangeRate } from "@/lib/currency";
import { toast } from "sonner";

export default function Investimentos() {
  const { data: investments = [], isLoading, error, refetch } = useInvestments();
  const { data: exchangeRate = 5.0 } = useExchangeRate();
  
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
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
      name: selectedNames.length > 0 ? selectedNames : "all",
      type: selectedTypes.length > 0 ? selectedTypes : "all",
      broker: selectedBrokers.length > 0 ? selectedBrokers : "all",
    });
  }, [filteredByDate, selectedNames, selectedTypes, selectedBrokers]);

  // Buscar histórico de preços se há período selecionado
  const investmentIds = useMemo(() => filtered.map(inv => inv.id), [filtered]);
  const { data: priceHistory = [] } = useInvestmentPricesByRange(
    investmentIds, 
    startDate, 
    endDate
  );

  // Cálculos do portfólio
  const portfolioTotals = useMemo(() => {
    return getPortfolioTotals(filtered, exchangeRate);
  }, [filtered, exchangeRate]);

  // Cálculo de variação no período
  const periodVariation = useMemo(() => {
    if (!startDate || !endDate || priceHistory.length === 0) return null;
    return getPeriodVariation(filtered, priceHistory, startDate, endDate, exchangeRate);
  }, [filtered, priceHistory, startDate, endDate, exchangeRate]);

  // Opções para filtros - buscar valores únicos dos investimentos
  const nameOptions = useMemo(() => {
    const uniqueNames = [...new Set(investments.map(inv => inv.nome_investimento))].filter(Boolean);
    return uniqueNames.map(name => ({
      label: name,
      value: name,
    }));
  }, [investments]);

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

        <div className="flex gap-2">
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
        </div>
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
          
          {/* Segunda linha - Filtro por nome */}
          <div className="min-w-0">
            <label className="text-sm text-muted-foreground">Nome do investimento</label>
            <div className="mt-1">
              <MultiSelect
                options={nameOptions}
                selected={selectedNames}
                onSelectionChange={(selected) => setSelectedNames(selected as string[])}
                placeholder="Filtrar por nome do investimento"
              />
            </div>
          </div>
          
          {/* Terceira linha - Grid 2 colunas */}
          <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
            <div className="min-w-0">
              <label className="text-sm text-muted-foreground">Tipo de investimento</label>
              <div className="mt-1">
                <MultiSelect
                  options={typeOptions}
                  selected={selectedTypes}
                  onSelectionChange={(selected) => setSelectedTypes(selected as string[])}
                  placeholder="Filtrar por tipo"
                />
              </div>
            </div>
            <div className="min-w-0">
              <label className="text-sm text-muted-foreground">Corretora</label>
              <div className="mt-1">
                <MultiSelect
                  options={brokerOptions}
                  selected={selectedBrokers}
                  onSelectionChange={(selected) => setSelectedBrokers(selected as string[])}
                  placeholder="Filtrar por corretora"
                />
              </div>
            </div>
          </div>
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
            title="Rentabilidade (desde a compra)"
            value={currency(portfolioTotals.rentabilidadeAbsoluta)}
            icon={Target}
            trend={{
              value: percentage(portfolioTotals.rentabilidadePercentual),
              isPositive: portfolioTotals.rentabilidadeAbsoluta >= 0,
            }}
          />
          {periodVariation && (
            <StatCard
              title="Variação no Período"
              value={currency(periodVariation.variationAbsolute)}
              icon={PieChart}
              trend={{
                value: percentage(periodVariation.variationPercentual),
                isPositive: periodVariation.variationAbsolute >= 0,
              }}
            />
          )}
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