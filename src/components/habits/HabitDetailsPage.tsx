import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { HabitMetrics } from "./HabitMetrics";
import { HabitProgressBars } from "./HabitProgressBars";
import { HabitSessionsList } from "./HabitSessionsList";
import { DateRangePicker } from "./DateRangePicker";
import { useHabitDefinitions } from "@/hooks/useHabitDefinitions";
import { subDays, startOfDay } from "date-fns";

export function HabitDetailsPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  
  const [startDate, setStartDate] = useState(() => subDays(startOfDay(new Date()), 6));
  const [endDate, setEndDate] = useState(() => startOfDay(new Date()));
  
  const { data: habits = [] } = useHabitDefinitions();
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Hábito não encontrado</p>
            <Button onClick={() => navigate("/habitos")} className="mt-4">
              Voltar para Hábitos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate("/habitos")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{habit.name}</h1>
          <p className="text-muted-foreground">
            Meta diária: {habit.targetSessions} sessões • {habit.targetTimeMinutes} minutos
          </p>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HabitMetrics habit={habit} startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>

      {/* Progress Bars */}
      <HabitProgressBars habit={habit} startDate={startDate} endDate={endDate} />

      {/* Sessions List */}
      <HabitSessionsList habitId={habit.id} startDate={startDate} endDate={endDate} />
    </div>
  );
}