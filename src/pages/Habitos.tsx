import { useEffect, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getHabits } from "@/lib/habits";
import { HabitForm } from "@/components/habits/HabitForm";
import { DailyHabitTracker } from "@/components/habits/DailyHabitTracker";
import { MonthlyView } from "@/components/habits/MonthlyView";
import { HistoricalView } from "@/components/habits/HistoricalView";
import { format, addMonths, subMonths } from "date-fns";

export default function Habitos() {
  const [habits, setHabits] = useState(getHabits());
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPageSEO("Hábitos", "Gerencie seus hábitos diários e acompanhe seu progresso");
  }, []);

  useEffect(() => {
    if (!selectedHabit && habits.length > 0) {
      setSelectedHabit(habits[0].id);
    }
  }, [habits, selectedHabit]);

  const refresh = () => {
    setHabits(getHabits());
    setRefreshKey(prev => prev + 1);
  };

  const selectedHabitData = habits.find(h => h.id === selectedHabit);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  return (
    <div className="min-h-screen">
      <header className="container py-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Hábitos</h1>
        <p className="text-muted-foreground mt-2">
          Cadastre até 5 hábitos e acompanhe seu progresso diário
        </p>
      </header>

      <main className="container py-8 space-y-8">
        <HabitForm 
          onHabitAdded={refresh} 
          canAddMore={habits.length < 5} 
        />

        {habits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Crie seu primeiro hábito acima para começar a acompanhar seu progresso.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="daily" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="daily">Diário</TabsTrigger>
                <TabsTrigger value="monthly">Mensal</TabsTrigger>
                <TabsTrigger value="historical">Histórico</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hábito:</span>
                  <Select value={selectedHabit || ""} onValueChange={setSelectedHabit}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione um hábito" />
                    </SelectTrigger>
                    <SelectContent>
                      {habits.map((habit) => (
                        <SelectItem key={habit.id} value={habit.id}>
                          {habit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <TabsContent value="daily" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Hoje - {format(new Date(), 'dd/MM/yyyy')}
                </h2>
              </div>

              <div className="grid gap-6">
                {habits.map((habit) => (
                  <DailyHabitTracker
                    key={`${habit.id}-${refreshKey}`}
                    habit={habit}
                    date={new Date()}
                    onUpdate={refresh}
                    onDelete={refresh}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Visualização Mensal
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[120px] text-center font-medium">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedHabitData ? (
                <MonthlyView
                  key={`${selectedHabit}-${currentYear}-${currentMonth}-${refreshKey}`}
                  habit={selectedHabitData}
                  year={currentYear}
                  month={currentMonth}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Selecione um hábito para ver a visualização mensal.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="historical" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Histórico e Estatísticas
                </h2>
              </div>

              {selectedHabitData ? (
                <HistoricalView
                  key={`${selectedHabit}-historical-${refreshKey}`}
                  habit={selectedHabitData}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Selecione um hábito para ver o histórico.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

