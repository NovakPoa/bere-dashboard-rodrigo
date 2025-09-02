import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus } from "lucide-react";
import { HabitDefinition } from "@/hooks/useHabitDefinitions";
import { useHabitSessionForDate, useUpdateHabitSession } from "@/hooks/useHabitSessions";
import { startOfDay } from "date-fns";

interface HabitCardProps {
  habit: HabitDefinition;
  onClick: () => void;
}

export interface HabitCardRef {
  getSaveData: () => {
    habitId: string;
    sessions: number;
    timeSpent: number;
    hasChanges: boolean;
  };
}

export const HabitCard = forwardRef<HabitCardRef, HabitCardProps>(({ habit, onClick }, ref) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const { data: session } = useHabitSessionForDate(habit.id, today);
  const updateSession = useUpdateHabitSession(true); // silent mode

  const [sessions, setSessions] = useState(session?.sessionsCompleted || 0);
  const [timeSpent, setTimeSpent] = useState(session?.timeSpentMinutes || 0);
  const [initialSessions, setInitialSessions] = useState(session?.sessionsCompleted || 0);
  const [initialTimeSpent, setInitialTimeSpent] = useState(session?.timeSpentMinutes || 0);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Debounced autosave function
  const autosave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (newSessions: number, newTimeSpent: number) => {
        clearTimeout(timeoutId);
        setHasPendingChanges(true);
        timeoutId = setTimeout(() => {
          updateSession.mutate({
            habitId: habit.id,
            date: today,
            sessionsCompleted: newSessions,
            timeSpentMinutes: newTimeSpent,
          }, {
            onSuccess: () => {
              setInitialSessions(newSessions);
              setInitialTimeSpent(newTimeSpent);
              setHasPendingChanges(false);
            },
            onError: () => {
              setHasPendingChanges(false);
            }
          });
        }, 600);
      };
    })(),
    [habit.id, today, updateSession]
  );

  useEffect(() => {
    if (session && !hasPendingChanges) {
      setSessions(session.sessionsCompleted || 0);
      setTimeSpent(session.timeSpentMinutes || 0);
      setInitialSessions(session.sessionsCompleted || 0);
      setInitialTimeSpent(session.timeSpentMinutes || 0);
    }
  }, [session, hasPendingChanges]);

  // Trigger autosave when sessions or timeSpent change
  useEffect(() => {
    if (sessions !== initialSessions || timeSpent !== initialTimeSpent) {
      autosave(sessions, timeSpent);
    }
  }, [sessions, timeSpent, initialSessions, initialTimeSpent, autosave]);

  useImperativeHandle(ref, () => ({
    getSaveData: () => ({
      habitId: habit.id,
      sessions,
      timeSpent,
      hasChanges: sessions !== initialSessions || timeSpent !== initialTimeSpent,
    }),
  }));

  const sessionsProgress = Math.min((sessions / habit.targetSessions) * 100, 100);
  const timeProgress = Math.min((timeSpent / habit.targetTimeMinutes) * 100, 100);

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
                onClick={() => { setHasPendingChanges(true); setSessions(Math.max(0, sessions - 1)); }}
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
                onClick={() => { setHasPendingChanges(true); setSessions(sessions + 1); }}
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
                onClick={() => { setHasPendingChanges(true); setTimeSpent(Math.max(0, timeSpent - 5)); }}
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
                onClick={() => { setHasPendingChanges(true); setTimeSpent(timeSpent + 5); }}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </div>

      </CardContent>
    </Card>
  );
});