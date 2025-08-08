import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const HABITS_KEY = "habits_v1";
const CHECKS_KEY = "habit_checks_v1";

type Habit = { id: string; name: string; createdAt: number };
type Checks = Record<string, string[]>; // habitId -> ["YYYY-MM-DD", ...]

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeDays(days: number): Date[] {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    return d;
  });
}

export default function Habitos() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const raw = localStorage.getItem(HABITS_KEY);
      return raw ? (JSON.parse(raw) as Habit[]) : [];
    } catch {
      return [];
    }
  });
  const [checks, setChecks] = useState<Checks>(() => {
    try {
      const raw = localStorage.getItem(CHECKS_KEY);
      return raw ? (JSON.parse(raw) as Checks) : {};
    } catch {
      return {};
    }
  });
  const [newHabit, setNewHabit] = useState("");
  const [period, setPeriod] = useState<number>(7);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => setPageSEO("Hábitos | Berê", "Crie hábitos e marque seu progresso diário"), []);
  useEffect(() => localStorage.setItem(HABITS_KEY, JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)), [checks]);
  useEffect(() => {
    if (!selectedId && habits[0]) setSelectedId(habits[0].id);
  }, [habits, selectedId]);

  const days = useMemo(() => rangeDays(period), [period]);

  function addHabit() {
    const name = newHabit.trim();
    if (!name) return;
    const h: Habit = { id: `${Date.now()}`, name, createdAt: Date.now() };
    setHabits((prev) => [h, ...prev]);
    setNewHabit("");
    setSelectedId((id) => id || h.id);
  }

  function isChecked(habitId: string, key: string) {
    return (checks[habitId] || []).includes(key);
  }

  function toggleCheck(habitId: string, key: string) {
    setChecks((prev) => {
      const arr = new Set(prev[habitId] || []);
      if (arr.has(key)) arr.delete(key); else arr.add(key);
      return { ...prev, [habitId]: Array.from(arr).sort() };
    });
  }

  const analysis = useMemo(() => {
    if (!selectedId) return { done: 0, total: days.length };
    const set = new Set(checks[selectedId] || []);
    const keys = days.map(dateKey);
    const done = keys.reduce((acc, k) => acc + (set.has(k) ? 1 : 0), 0);
    return { done, total: keys.length };
  }, [selectedId, checks, days]);

  const chartData = [
    { name: "Feitos", value: analysis.done },
    { name: "Restantes", value: Math.max(analysis.total - analysis.done, 0) },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">Hábitos | Berê</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="criar">
          <h2 id="criar" className="sr-only">Criar hábito</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Novo hábito</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Input
                placeholder="Ex.: Beber 2L de água"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
              />
              <Button onClick={addHabit}>Adicionar</Button>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="periodo">
          <h2 id="periodo" className="sr-only">Período</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section aria-labelledby="lista" className="space-y-4">
          <h2 id="lista" className="text-sm text-muted-foreground">Seus hábitos</h2>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crie seu primeiro hábito acima.</p>
          ) : (
            <div className="space-y-3">
              {habits.map((h) => (
                <Card key={h.id} onClick={() => setSelectedId(h.id)} className={"cursor-pointer"}>
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-base">{h.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(40px, 1fr))` }}>
                        {days.map((d) => {
                          const key = dateKey(d);
                          const checked = isChecked(h.id, key);
                          return (
                            <div key={key} className="flex flex-col items-center gap-1 py-2">
                              <span className="text-[10px] text-muted-foreground">{d.getDate().toString().padStart(2, "0")}</span>
                              <Checkbox checked={checked} onCheckedChange={() => toggleCheck(h.id, key)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="analise">
          <h2 id="analise" className="text-sm text-muted-foreground mb-2">Análise</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Progresso no período</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hábito:</span>
                  <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder={habits.length ? "Selecione um hábito" : "Sem hábitos"} />
                    </SelectTrigger>
                    <SelectContent>
                      {habits.map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {selectedId ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={chartData} innerRadius={70} outerRadius={110} paddingAngle={2}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione um hábito para ver o gráfico.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

