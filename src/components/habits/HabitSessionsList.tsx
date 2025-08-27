import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, Plus, Minus } from "lucide-react";
import { useHabitSessions, useUpdateHabitSession } from "@/hooks/useHabitSessions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HabitSessionsListProps {
  habitId: string;
  startDate: Date;
  endDate: Date;
}

export function HabitSessionsList({ habitId, startDate, endDate }: HabitSessionsListProps) {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSessions, setEditSessions] = useState(0);
  const [editTime, setEditTime] = useState(0);

  const { data: sessions = [] } = useHabitSessions(habitId, startDate, endDate);
  const updateSession = useUpdateHabitSession();

  const pageSize = 10;
  const paginatedSessions = sessions.slice(page * pageSize, (page + 1) * pageSize);
  const hasMore = sessions.length > (page + 1) * pageSize;

  const handleEdit = (session: any) => {
    setEditingId(session.id);
    setEditSessions(session.sessionsCompleted);
    setEditTime(session.timeSpentMinutes);
  };

  const handleSave = () => {
    if (!editingId) return;
    
    const session = sessions.find(s => s.id === editingId);
    if (!session) return;

    updateSession.mutate({
      habitId,
      date: parseISO(session.date),
      sessionsCompleted: editSessions,
      timeSpentMinutes: editTime,
    }, {
      onSuccess: () => {
        setEditingId(null);
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditSessions(0);
    setEditTime(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Sessões</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma sessão registrada no período selecionado
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedSessions.map((session) => {
              const isEditing = editingId === session.id;
              const sessionDate = parseISO(session.date);

              return (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(sessionDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(sessionDate, "EEEE", { locale: ptBR })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditSessions(Math.max(0, editSessions - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={editSessions}
                            onChange={(e) => setEditSessions(parseInt(e.target.value) || 0)}
                            className="w-16 text-center"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditSessions(editSessions + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm">sessões</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditTime(Math.max(0, editTime - 5))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={editTime}
                            onChange={(e) => setEditTime(parseInt(e.target.value) || 0)}
                            className="w-16 text-center"
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditTime(editTime + 5)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm">min</span>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave} disabled={updateSession.isPending}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">
                          {session.sessionsCompleted} sessões
                        </Badge>
                        <Badge variant="secondary">
                          {session.timeSpentMinutes} min
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEdit(session)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setPage(page + 1)}
                >
                  Ver mais 10 registros
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}