import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Target, Clock, TrendingUp } from "lucide-react";
import { getDailyHabitData } from "@/lib/habits";
import { Habit } from "@/types/habit";
import { format } from "date-fns";

interface MonthlyViewProps {
  habit: Habit;
  year: number;
  month: number;
}

export function MonthlyView({ habit, year, month }: MonthlyViewProps) {
  const dailyData = getDailyHabitData(habit.id, year, month);
  
  if (dailyData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum dado encontrado para este período
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSessions = dailyData.reduce((sum, day) => sum + day.sessions, 0);
  const totalTime = dailyData.reduce((sum, day) => sum + day.timeSpent, 0);
  const daysWithActivity = dailyData.filter(day => day.sessions > 0 || day.timeSpent > 0).length;
  
  const expectedTotalSessions = dailyData.length * habit.targetSessions;
  const expectedTotalTime = dailyData.length * habit.targetTime;
  
  const sessionsProgress = expectedTotalSessions > 0 ? (totalSessions / expectedTotalSessions) * 100 : 0;
  const timeProgress = expectedTotalTime > 0 ? (totalTime / expectedTotalTime) * 100 : 0;
  const overallProgress = (sessionsProgress + timeProgress) / 2;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {format(new Date(year, month - 1), 'MMMM yyyy')} - {habit.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                Sessões
              </div>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <div className="text-xs text-muted-foreground">
                Meta: {expectedTotalSessions} ({Math.round(sessionsProgress)}%)
              </div>
              <Progress value={Math.min(100, sessionsProgress)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Tempo Total
              </div>
              <div className="text-2xl font-bold">{totalTime}min</div>
              <div className="text-xs text-muted-foreground">
                Meta: {expectedTotalTime}min ({Math.round(timeProgress)}%)
              </div>
              <Progress value={Math.min(100, timeProgress)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Dias Ativos
              </div>
              <div className="text-2xl font-bold">{daysWithActivity}</div>
              <div className="text-xs text-muted-foreground">
                de {dailyData.length} dias ({Math.round((daysWithActivity / dailyData.length) * 100)}%)
              </div>
              <Progress value={(daysWithActivity / dailyData.length) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Progresso Geral</div>
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <Badge variant={overallProgress >= 100 ? "default" : overallProgress >= 70 ? "secondary" : "outline"}>
                {overallProgress >= 100 ? "Meta atingida!" : overallProgress >= 70 ? "Bom progresso" : "Pode melhorar"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calendário do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {/* Header with day names */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {dailyData.map((day, index) => {
              const date = new Date(day.date);
              const dayNumber = date.getDate();
              const sessionsMet = day.sessions >= day.targetSessions;
              const timeMet = day.timeSpent >= day.targetTime;
              const hasActivity = day.sessions > 0 || day.timeSpent > 0;
              
              let bgColor = "bg-muted/30";
              if (sessionsMet && timeMet) {
                bgColor = "bg-primary/20 border-primary/40";
              } else if (hasActivity) {
                bgColor = "bg-secondary/60 border-secondary";
              }
              
              return (
                <div
                  key={day.date}
                  className={`p-2 rounded-md border text-center transition-colors ${bgColor}`}
                >
                  <div className="text-sm font-medium">{dayNumber}</div>
                  {hasActivity && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <div>{day.sessions}s</div>
                      <div>{day.timeSpent}m</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border-primary/40"></div>
              <span>Meta atingida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-secondary/60 border-secondary"></div>
              <span>Atividade parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted/30"></div>
              <span>Sem atividade</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}