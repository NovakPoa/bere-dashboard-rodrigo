import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { CalendarIcon, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateHabitSession } from "@/hooks/useHabitSessions";

interface AddRetroactiveSessionProps {
  habitId: string;
  onSessionAdded?: () => void;
}

export function AddRetroactiveSession({ habitId, onSessionAdded }: AddRetroactiveSessionProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [sessions, setSessions] = useState(1);
  const [timeSpent, setTimeSpent] = useState(30);
  const [showCalendar, setShowCalendar] = useState(false);

  const updateSession = useUpdateHabitSession();

  const handleSave = () => {
    if (!selectedDate) return;

    updateSession.mutate({
      habitId,
      date: selectedDate,
      sessionsCompleted: sessions,
      timeSpentMinutes: timeSpent,
    }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedDate(undefined);
        setSessions(1);
        setTimeSpent(30);
        onSessionAdded?.();
      }
    });
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedDate(undefined);
    setSessions(1);
    setTimeSpent(30);
    setShowCalendar(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar sessão
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Adicionar Sessão Retroativa</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date">Data da sessão</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessions">Número de sessões</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(Math.max(0, sessions - 1))}
                className="h-9 w-9 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="sessions"
                type="number"
                value={sessions}
                onChange={(e) => setSessions(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center"
                min="0"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessions(sessions + 1)}
                className="h-9 w-9 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Tempo gasto (minutos)</Label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(Math.max(0, timeSpent - 5))}
                className="h-9 w-9 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="time"
                type="number"
                value={timeSpent}
                onChange={(e) => setTimeSpent(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center"
                min="0"
                step="5"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeSpent(timeSpent + 5)}
                className="h-9 w-9 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={!selectedDate || updateSession.isPending}
              className="flex-1"
            >
              {updateSession.isPending ? "Salvando..." : "Salvar sessão"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}