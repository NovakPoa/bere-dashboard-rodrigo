import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddHabit } from "@/hooks/useHabits";

interface HabitFormProps {
  onHabitAdded: () => void;
  canAddMore: boolean;
}

export function HabitForm({ onHabitAdded, canAddMore }: HabitFormProps) {
  const [name, setName] = useState("");
  const [targetSessions, setTargetSessions] = useState("1");
  const [targetTime, setTargetTime] = useState("30");
  const addHabit = useAddHabit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !canAddMore) return;
    
    addHabit.mutate({
      name: name.trim(),
      targetSessions: parseInt(targetSessions) || 1,
      targetTime: parseInt(targetTime) || 30
    }, {
      onSuccess: () => {
        setName("");
        setTargetSessions("1");
        setTargetTime("30");
        onHabitAdded();
      }
    });
  };

  if (!canAddMore) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Novo Hábito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Você já tem 5 hábitos cadastrados (limite máximo).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Novo Hábito</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do hábito</Label>
            <Input
              id="name"
              placeholder="Ex.: Exercitar-se"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessions">Meta de sessões/dia</Label>
              <Input
                id="sessions"
                type="number"
                min="1"
                max="10"
                value={targetSessions}
                onChange={(e) => setTargetSessions(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="time">Meta de tempo (min/dia)</Label>
              <Input
                id="time"
                type="number"
                min="5"
                max="480"
                step="5"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={addHabit.isPending}>
            {addHabit.isPending ? "Adicionando..." : "Adicionar Hábito"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}