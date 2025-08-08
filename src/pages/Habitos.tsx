import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

const HABITS_KEY = "habits_v1";
const CHECKS_KEY = "habit_checks_v1";

type Habit = { id: string; name: string; createdAt: number };
type Checks = Record<string, Record<string, number>>; // habitId -> { "YYYY-MM-DD": count }
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
    if (!raw) return {};
    const parsed = JSON.parse(raw) as any;
    const migrated: Checks = {};
    for (const [habitId, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        const rec: Record<string, number> = {};
        (val as unknown as string[]).forEach((k) => {
          rec[k] = (rec[k] || 0) + 1;
        });
        migrated[habitId] = rec;
      } else if (val && typeof val === "object") {
        migrated[habitId] = val as Record<string, number>;
      }
    }
    return migrated;
  } catch {
    return {};
  }
});
  const [newHabit, setNewHabit] = useState("");
const [range, setRange] = useState<DateRange>(() => {
  const defaults = rangeDays(7);
  return { from: defaults[0], to: defaults[defaults.length - 1] };
});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => setPageSEO("Hábitos | Berê", "Crie hábitos e marque seu progresso diário"), []);
  useEffect(() => localStorage.setItem(HABITS_KEY, JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)), [checks]);
  useEffect(() => {
    if (!selectedId && habits[0]) setSelectedId(habits[0].id);
  }, [habits, selectedId]);

const days = useMemo(() => {
  const from = range?.from;
  const to = range?.to ?? range?.from;
  if (!from) return [];
  const arr: Date[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date((to ?? from).getFullYear(), (to ?? from).getMonth(), (to ?? from).getDate());
  while (cur <= last) {
    arr.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}, [range]);
  function addHabit() {
    const name = newHabit.trim();
    if (!name) return;
    const h: Habit = { id: `${Date.now()}`, name, createdAt: Date.now() };
    setHabits((prev) => [h, ...prev]);
    setNewHabit("");
    setSelectedId((id) => id || h.id);
  }

function getCount(habitId: string, key: string) {
  return checks[habitId]?.[key] ?? 0;
}

function setCount(habitId: string, key: string, count: number) {
  setChecks((prev) => {
    const byDate = { ...(prev[habitId] || {}) };
    if (count <= 0) {
      delete byDate[key];
    } else {
      byDate[key] = Math.floor(count);
    }
    return { ...prev, [habitId]: byDate };
  });
}

function increment(habitId: string, key: string) {
  setCount(habitId, key, getCount(habitId, key) + 1);
}

function decrement(habitId: string, key: string) {
  setCount(habitId, key, Math.max(0, getCount(habitId, key) - 1));
}

const analysis = useMemo(() => {
  if (!selectedId) return { done: 0, total: days.length };
  const byDate = checks[selectedId] || {};
  const keys = days.map(dateKey);
  const done = keys.reduce((acc, k) => acc + ((byDate[k] ?? 0) > 0 ? 1 : 0), 0);
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-auto justify-start">
          {range?.from && range?.to ? `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}` : "Selecione datas"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => setRange(r ?? undefined)}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
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
  const count = getCount(h.id, key);
  return (
    <div key={key} className="flex flex-col items-center gap-1 py-2">
      <span className="text-[10px] text-muted-foreground">{d.getDate().toString().padStart(2, "0")}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Diminuir" onClick={(e) => { e.stopPropagation(); decrement(h.id, key); }}>-</Button>
        <span className="text-xs tabular-nums min-w-[1.25rem] text-center">{count}</span>
        <Button variant="outline" size="icon" aria-label="Aumentar" onClick={(e) => { e.stopPropagation(); increment(h.id, key); }}>+</Button>
      </div>
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

