
import { useEffect, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { subDays } from "date-fns";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import RecentMeals from "@/components/nutrition/RecentMeals";
import { useFoodEntries } from "@/hooks/useNutrition";
import DateRangePicker from "@/components/finance/DateRangePicker";

export default function Alimentacao() {
  const { data: entries = [] } = useFoodEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => subDays(new Date(), 6)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    () => new Date()
  );

  useEffect(() => setPageSEO("Alimentação", "Visualize e analise seus dados nutricionais"), []);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <header className="py-4 md:py-6">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Alimentação</h1>
      </header>

      <main className="space-y-6 md:space-y-8">
        <section aria-labelledby="filters" className="flex justify-end">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </section>

      <NutritionCharts entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />


      <RecentMeals entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />
      </main>
    </div>
  );
}
