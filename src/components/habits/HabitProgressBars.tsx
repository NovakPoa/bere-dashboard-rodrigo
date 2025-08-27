import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitMetrics } from "@/hooks/useHabitMetrics";

interface HabitProgressBarsProps {
  habit: HabitDefinition;
  startDate: Date;
  endDate: Date;
}

export function HabitProgressBars({ habit, startDate, endDate }: HabitProgressBarsProps) {
  const metrics = useHabitMetrics(habit, startDate, endDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projetado vs Realizado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sessões</span>
            <span className="font-medium">
              {metrics.totalSessions} / {metrics.projectedSessions} ({metrics.sessionsProgress.toFixed(0)}%)
            </span>
          </div>
          <Progress value={metrics.sessionsProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Realizado: {metrics.totalSessions}</span>
            <span>Meta: {metrics.projectedSessions}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tempo (minutos)</span>
            <span className="font-medium">
              {metrics.totalTimeMinutes} / {metrics.projectedTimeMinutes} ({metrics.timeProgress.toFixed(0)}%)
            </span>
          </div>
          <Progress value={metrics.timeProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Realizado: {metrics.totalTimeMinutes} min</span>
            <span>Meta: {metrics.projectedTimeMinutes} min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}