import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitSessionForDate, useUpdateHabitSession } from "@/hooks/useHabitSessions";
import { format } from "date-fns";

interface DailyHabitTrackerProps {
  habit: HabitDefinition;
  date: Date;
  onUpdate: () => void;
}

export function DailyHabitTracker({ habit, date, onUpdate }: DailyHabitTrackerProps) {
  const { data: session } = useHabitSessionForDate(habit.id, date);
  const updateSession = useUpdateHabitSession();

  const [sessions, setSessions] = useState(session?.sessionsCompleted || 0);
  const [timeSpent, setTimeSpent] = useState(session?.timeSpentMinutes || 0);

  const sessionsProgress = Math.min((sessions / habit.targetSessions) * 100, 100);
  const timeProgress = Math.min((timeSpent / habit.targetTimeMinutes) * 100, 100);
  const overallProgress = (sessionsProgress + timeProgress) / 2;

  const handleUpdate = () => {
    updateSession.mutate({
      habitId: habit.id,
      date,
      sessionsCompleted: sessions,
      timeSpentMinutes: timeSpent,
    }, {
      onSuccess: () => {
        onUpdate();
      }
    });
  };


  const getProgressBadge = () => {
    if (overallProgress >= 100) return <Badge className="bg-green-500">Concluído</Badge>;
    if (overallProgress >= 50) return <Badge className="bg-yellow-500">Em progresso</Badge>;
    return <Badge variant="secondary">Iniciando</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex-1">
          <CardTitle className="text-lg">{habit.name}</CardTitle>
          <div className="text-sm text-muted-foreground">
            Meta: {habit.targetSessions} sessões • {habit.targetTimeMinutes} min
          </div>
        </div>
        {getProgressBadge()}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sessões</label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(Math.max(0, sessions - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="text-center min-w-[40px]">
                <span className="font-medium">{sessions}</span>
                <span className="text-muted-foreground">/{habit.targetSessions}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(sessions + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Progress value={sessionsProgress} className="h-2" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tempo (min)</label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(Math.max(0, timeSpent - 5))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="text-center min-w-[60px]">
                <span className="font-medium">{timeSpent}</span>
                <span className="text-muted-foreground">/{habit.targetTimeMinutes}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(timeSpent + 5)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Progress value={timeProgress} className="h-2" />
          </div>
        </div>

        <Button 
          onClick={handleUpdate}
          disabled={updateSession.isPending}
          className="w-full"
        >
          {updateSession.isPending ? "Salvando..." : "Salvar Progresso"}
        </Button>
      </CardContent>
    </Card>
  );
}