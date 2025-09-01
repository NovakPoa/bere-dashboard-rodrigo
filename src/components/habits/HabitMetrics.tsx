import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitMetrics } from "@/hooks/useHabitMetrics";

interface HabitMetricsProps {
  habit: HabitDefinition;
  startDate: Date;
  endDate: Date;
}

export function HabitMetrics({ habit, startDate, endDate }: HabitMetricsProps) {
  const metrics = useHabitMetrics(habit, startDate, endDate);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{metrics.totalSessions}</div>
        <div className="text-sm text-muted-foreground">Total de Sessões</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{metrics.totalTimeMinutes}</div>
        <div className="text-sm text-muted-foreground">Total de Minutos</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{metrics.sessionsProgress.toFixed(0)}%</div>
        <div className="text-sm text-muted-foreground">Meta de Sessões</div>
        <div className="text-xs text-muted-foreground">
          {metrics.totalSessions}/{metrics.projectedSessions}
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{metrics.timeProgress.toFixed(0)}%</div>
        <div className="text-sm text-muted-foreground">Meta de Tempo</div>
        <div className="text-xs text-muted-foreground">
          {metrics.totalTimeMinutes}/{metrics.projectedTimeMinutes} min
        </div>
      </div>
    </div>
  );
}