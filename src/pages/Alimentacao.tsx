
import { useEffect, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import RecentMeals from "@/components/nutrition/RecentMeals";
import AddMealDialog from "@/components/nutrition/AddMealDialog";
import { useFoodEntries } from "@/hooks/useNutrition";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

export default function Alimentacao() {
  const { data: entries = [] } = useFoodEntries();
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => startOfMonth(new Date())
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    () => new Date()
  );
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => setPageSEO("Alimentação", "Visualize e analise seus dados nutricionais"), []);

  return (
    <div className="container px-4 py-6">
      <header className="flex justify-between items-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Alimentação</h1>
        
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-w-sm mx-auto">
            <DrawerHeader>
              <DrawerTitle>Adicionar Refeição</DrawerTitle>
            </DrawerHeader>
            <AddMealDialog />
          </DrawerContent>
        </Drawer>
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

        <NutritionCharts entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />

        <RecentMeals entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />
      </main>
    </div>
  );
}
