import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitSessionForDate } from "@/hooks/useHabitSessions";
import { format } from "date-fns";

interface HabitCardProps {
  habit: HabitDefinition;
  onClick: () => void;
}

export function HabitCard({ habit, onClick }: HabitCardProps) {
  const today = new Date();
  const { data: todaySession } = useHabitSessionForDate(habit.id, today);

  const sessionsProgress = todaySession 
    ? Math.min((todaySession.sessionsCompleted / habit.targetSessions) * 100, 100)
    : 0;

  const timeProgress = todaySession 
    ? Math.min((todaySession.timeSpentMinutes / habit.targetTimeMinutes) * 100, 100)
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{habit.name}</CardTitle>
        <div className="text-sm text-muted-foreground">
          Meta: {habit.targetSessions} sessões • {habit.targetTimeMinutes} min
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