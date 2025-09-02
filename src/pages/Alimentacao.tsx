
import { useEffect, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { subDays } from "date-fns";
import { Plus } from "lucide-react";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import RecentMeals from "@/components/nutrition/RecentMeals";
import AddMealDialog from "@/components/nutrition/AddMealDialog";
import { useFoodEntries } from "@/hooks/useNutrition";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { Button } from "@/components/ui/button";

export default function Alimentacao() {
  const { data: entries = [] } = useFoodEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => subDays(new Date(), 6)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    () => new Date()
  );
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => setPageSEO("Alimentação", "Visualize e analise seus dados nutricionais"), []);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden relative">
      <header className="py-4 md:py-6 flex justify-between items-center">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Alimentação</h1>
        <Button
          onClick={() => setShowAddDialog(true)}
          size="icon"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="h-5 w-5" />
        </Button>
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

      <AddMealDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
