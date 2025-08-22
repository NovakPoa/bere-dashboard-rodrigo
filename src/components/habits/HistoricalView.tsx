import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Clock, TrendingUp, Award } from "lucide-react";
import { getMonthlyHabitSummaries } from "@/lib/habits";
import { Habit, MonthlyHabitSummary } from "@/types/habit";
import { format, parseISO } from "date-fns";

interface HistoricalViewProps {
  habit: Habit;
}

export function HistoricalView({ habit }: HistoricalViewProps) {
  const monthlyData = getMonthlyHabitSummaries(habit.id);
  
  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum histórico encontrado para este hábito
          </p>
        </CardContent>
      </Card>
    );
  }

  const bestMonth = monthlyData.reduce((best, month) => 
    month.targetMetPercentage > best.targetMetPercentage ? month : best
  );

  const averageProgress = monthlyData.reduce((sum, month) => sum + month.targetMetPercentage, 0) / monthlyData.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo Histórico - {habit.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Total de Meses
              </div>
              <div className="text-2xl font-bold">{monthlyData.length}</div>
              <div className="text-xs text-muted-foreground">
                Meses com atividade registrada
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                Progresso Médio
              </div>
              <div className="text-2xl font-bold">{Math.round(averageProgress)}%</div>
              <Progress value={Math.min(100, averageProgress)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Award className="h-4 w-4" />
                Melhor Mês
              </div>
              <div className="text-lg font-bold">
                {format(parseISO(bestMonth.month + '-01'), 'MMM yyyy')}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(bestMonth.targetMetPercentage)}% da meta
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((month) => (
              <MonthlyCard key={month.month} month={month} habit={habit} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MonthlyCardProps {
  month: MonthlyHabitSummary;
  habit: Habit;
}

function MonthlyCard({ month, habit }: MonthlyCardProps) {
  const monthDate = parseISO(month.month + '-01');
  const isCurrentMonth = format(new Date(), 'yyyy-MM') === month.month;
  
  return (
    <Card className={`transition-smooth hover:shadow-elegant ${isCurrentMonth ? 'ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {format(monthDate, 'MMMM yyyy')}
            {isCurrentMonth && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Atual
              </Badge>
            )}
          </CardTitle>
          <Badge variant={month.targetMetPercentage >= 100 ? "default" : month.targetMetPercentage >= 70 ? "secondary" : "outline"}>
            {Math.round(month.targetMetPercentage)}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Sessões</div>
            <div className="font-medium">{month.totalSessions}</div>
            <div className="text-xs text-muted-foreground">
              ~{month.averageDailySessions.toFixed(1)}/dia
            </div>
          </div>
          
          <div>
            <div className="text-muted-foreground">Tempo</div>
            <div className="font-medium">{month.totalTime}min</div>
            <div className="text-xs text-muted-foreground">
              ~{month.averageDailyTime.toFixed(0)}min/dia
            </div>
          </div>
          
          <div>
            <div className="text-muted-foreground">Dias Ativos</div>
            <div className="font-medium">{month.daysWithActivity}</div>
            <div className="text-xs text-muted-foreground">
              dias com atividade
            </div>
          </div>
          
          <div>
            <div className="text-muted-foreground">Meta</div>
            <div className="font-medium">{Math.round(month.targetMetPercentage)}%</div>
            <Progress value={Math.min(100, month.targetMetPercentage)} className="h-1 mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}