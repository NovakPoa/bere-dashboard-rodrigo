import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus } from "lucide-react";
import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitSessionForDate, useUpdateHabitSession } from "@/hooks/useHabitSessions";

interface HabitCardProps {
  habit: HabitDefinition;
  onClick: () => void;
  onUpdate: () => void;
}

export function HabitCard({ habit, onClick, onUpdate }: HabitCardProps) {
  const today = new Date();
  const { data: session } = useHabitSessionForDate(habit.id, today);
  const updateSession = useUpdateHabitSession();

  const [sessions, setSessions] = useState(session?.sessionsCompleted || 0);
  const [timeSpent, setTimeSpent] = useState(session?.timeSpentMinutes || 0);

  const sessionsProgress = Math.min((sessions / habit.targetSessions) * 100, 100);
  const timeProgress = Math.min((timeSpent / habit.targetTimeMinutes) * 100, 100);

  const handleSave = () => {
    updateSession.mutate({
      habitId: habit.id,
      date: today,
      sessionsCompleted: sessions,
      timeSpentMinutes: timeSpent,
    }, {
      onSuccess: () => {
        onUpdate();
      }
    });
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle 
          className="text-lg cursor-pointer hover:text-primary transition-colors"
          onClick={handleTitleClick}
        >
          {habit.name}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Meta: {habit.targetSessions} sessões • {habit.targetTimeMinutes} min
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Sessões hoje</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(Math.max(0, sessions - 1))}
                className="h-7 w-7 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium min-w-[50px] text-center">
                {sessions}/{habit.targetSessions}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(sessions + 1)}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={sessionsProgress} className="h-2" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tempo hoje</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(Math.max(0, timeSpent - 5))}
                className="h-7 w-7 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium min-w-[50px] text-center">
                {timeSpent}/{habit.targetTimeMinutes} min
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(timeSpent + 5)}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </div>

        <Button 
          onClick={handleSave}
          disabled={updateSession.isPending}
          variant="outline"
          className="w-full mt-3"
          size="sm"
        >
          {updateSession.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}