import { useEffect, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { startOfMonth } from "date-fns";
import { useHealthData } from "@/hooks/useHealth";
import DateRangePicker from "@/components/finance/DateRangePicker";
import HealthChart from "@/components/health/HealthChart";
import HealthMetrics from "@/components/health/HealthMetrics";

export default function Saude() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => startOfMonth(new Date())
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    () => new Date()
  );

  const { dailyData, metrics, isLoading } = useHealthData(
    startDate && endDate ? { from: startDate, to: endDate } : undefined
  );

  useEffect(() => setPageSEO("Saúde", "Visualize o balanço entre calorias consumidas e gastas"), []);

  if (isLoading) {
    return (
      <div className="container px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados de saúde...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Saúde</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o balanço entre calorias consumidas e gastas
        </p>
      </header>

      <main className="space-y-6 md:space-y-8">
        <section aria-labelledby="filters" className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
          <div className="w-full max-w-lg">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </section>

        <HealthMetrics metrics={metrics} />

        <HealthChart data={dailyData} />

        {dailyData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum dado encontrado para o período selecionado.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Adicione refeições e atividades físicas para ver seu balanço calórico.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}