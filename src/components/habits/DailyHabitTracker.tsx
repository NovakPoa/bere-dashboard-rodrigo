import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Target, Clock } from "lucide-react";
import { useDeleteHabit, useHabitSessions, type Habit } from "@/hooks/useHabits";
import { format } from "date-fns";

interface DailyHabitTrackerProps {
  habit: Habit;
  date: Date;
  onUpdate: () => void;
  onDelete: () => void;
}

export function DailyHabitTracker({ habit, date, onUpdate, onDelete }: DailyHabitTrackerProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { updateSession, getSessionForDate } = useHabitSessions();
  const deleteHabit = useDeleteHabit();
  const session = getSessionForDate(habit.id, dateStr);
  
  const [sessions, setSessions] = useState(session?.sessions || 0);
  const [timeSpent, setTimeSpent] = useState(session?.timeSpent || 0);

  const handleUpdate = () => {
    updateSession(habit.id, dateStr, sessions, timeSpent);
    onUpdate();
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o hábito "${habit.name}"?`)) {
      deleteHabit.mutate(habit.id, {
        onSuccess: () => onDelete()
      });
    }
  };

  const sessionsMetPercentage = habit.targetSessions > 0 ? (sessions / habit.targetSessions) * 100 : 0;
  const timeMetPercentage = habit.targetTime > 0 ? (timeSpent / habit.targetTime) * 100 : 0;
  const overallProgress = Math.min(100, (sessionsMetPercentage + timeMetPercentage) / 2);

  return (
    <Card className="transition-smooth hover:shadow-elegant">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{habit.name}</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span>{habit.targetSessions} sessões</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{habit.targetTime}min</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={overallProgress >= 100 ? "default" : "secondary"}>
              {Math.round(overallProgress)}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sessões realizadas</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSessions(Math.max(0, sessions - 1))}
                className="h-8 w-8"
              >
                -
              </Button>
              <Input
                type="number"
                min="0"
                max="20"
                value={sessions}
                onChange={(e) => setSessions(parseInt(e.target.value) || 0)}
                className="text-center h-8"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSessions(sessions + 1)}
                className="h-8 w-8"
              >
                +
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Meta: {habit.targetSessions} ({Math.round(sessionsMetPercentage)}%)
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tempo (minutos)</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTimeSpent(Math.max(0, timeSpent - 5))}
                className="h-8 w-8"
              >
                -
              </Button>
              <Input
                type="number"
                min="0"
                step="5"
                value={timeSpent}
                onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
                className="text-center h-8"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTimeSpent(timeSpent + 5)}
                className="h-8 w-8"
              >
                +
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Meta: {habit.targetTime}min ({Math.round(timeMetPercentage)}%)
            </div>
          </div>
        </div>
        
        <Button onClick={handleUpdate} className="w-full" size="sm">
          Salvar Progresso
        </Button>
      </CardContent>
    </Card>
  );
}