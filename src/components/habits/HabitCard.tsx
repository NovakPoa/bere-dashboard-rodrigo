import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HabitDefinition, useDeleteHabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitSessionForDate } from "@/hooks/useHabitSessions";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface HabitCardProps {
  habit: HabitDefinition;
  onClick: () => void;
  onDelete?: () => void;
}

export function HabitCard({ habit, onClick, onDelete }: HabitCardProps) {
  const today = new Date();
  const { data: todaySession } = useHabitSessionForDate(habit.id, today);
  const deleteHabitDefinition = useDeleteHabitDefinition();

  const sessionsProgress = todaySession 
    ? Math.min((todaySession.sessionsCompleted / habit.targetSessions) * 100, 100)
    : 0;

  const timeProgress = todaySession 
    ? Math.min((todaySession.timeSpentMinutes / habit.targetTimeMinutes) * 100, 100)
    : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o hábito "${habit.name}"?`)) {
      deleteHabitDefinition.mutate(habit.id, {
        onSuccess: () => {
          onDelete?.();
        }
      });
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{habit.name}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Meta: {habit.targetSessions} sessões • {habit.targetTimeMinutes} min
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sessões hoje</span>
            <span>{todaySession?.sessionsCompleted || 0}/{habit.targetSessions}</span>
          </div>
          <Progress value={sessionsProgress} className="h-2" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tempo hoje</span>
            <span>{todaySession?.timeSpentMinutes || 0}/{habit.targetTimeMinutes} min</span>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}