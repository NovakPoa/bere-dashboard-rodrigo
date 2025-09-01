import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitCard } from "@/components/habits/HabitCard";
import { DailyHabitTracker } from "@/components/habits/DailyHabitTracker";
import { useHabitDefinitions } from "@/hooks/useHabitDefinitions";
import { setPageSEO } from "@/lib/seo";

export default function Habitos() {
  const navigate = useNavigate();
  const { data: habits = [], refetch } = useHabitDefinitions();
  const [refreshKey, setRefreshKey] = useState(0);
  const currentDate = new Date();

  useEffect(() => {
    setPageSEO("Hábitos - Gestão de Rotinas Diárias", "Monitore e desenvolva seus hábitos diários com metas personalizáveis e acompanhamento detalhado do progresso.");
  }, []);

  const refresh = () => {
    refetch();
    setRefreshKey(prev => prev + 1);
  };

  const handleHabitClick = (habitId: string) => {
    navigate(`/habitos/${habitId}`);
  };

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <div className="py-4 md:py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Hábitos</h1>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-8 pb-8">

        <HabitForm 
          onHabitAdded={refresh} 
          canAddMore={habits.length < 5} 
        />

        {habits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum hábito criado ainda</h3>
              <p className="text-muted-foreground">
                Comece criando seu primeiro hábito usando o formulário acima.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 md:space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onClick={() => handleHabitClick(habit.id)}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progresso de Hoje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {habits.map((habit) => (
                  <DailyHabitTracker
                    key={`${habit.id}-${refreshKey}`}
                    habit={habit}
                    date={currentDate}
                    onUpdate={refresh}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

