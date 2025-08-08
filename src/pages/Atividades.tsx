import { useEffect, useMemo, useState } from "react";
import { format, eachDayOfInterval, startOfDay, addDays, differenceInCalendarDays, subDays } from "date-fns";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import StatCard from "@/components/finance/StatCard";
import ActivitiesChart from "@/components/fitness/ActivitiesChart";
import ActivitiesTable from "@/components/fitness/ActivitiesTable";
import { FitnessEntry, getActivities, groupTotalsByModality, totalCalories } from "@/lib/fitness";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STORAGE_KEY = "fitness_activities_v1";

type FitnessEntryLocal = FitnessEntry;

const parseFitness = (msg: string): FitnessEntryLocal | null => {
  const lower = msg.toLowerCase();
  if (!lower.trim()) return null;
  // tipo
  const tipos = [
    "corrida",
    "natação",
    "natacao",
    "bike",
    "ciclismo",
    "musculação",
    "musculacao",
    "caminhada",
    "jiu-jitsu",
    "jiujitsu",
    "bjj",
  ];
  const tipo = tipos.find((t) => lower.includes(t)) || "atividade";
  // minutos
  const minMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(min|m|minutos|h|hora|horas)/);
  let minutos = 0;
  if (minMatch) {
    const val = parseFloat(minMatch[1].replace(",", "."));
    const unit = minMatch[2];
    minutos = /h|hora/.test(unit) ? Math.round(val * 60) : Math.round(val);
  }
  // distância km
  const distMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*km/);
  const distanciaKm = distMatch ? parseFloat(distMatch[1].replace(",", ".")) : undefined;

  return { tipo, minutos, distanciaKm, data: new Date().toISOString(), nota: msg };
};

function save(entry: FitnessEntryLocal) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as FitnessEntryLocal[];
  all.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export default function Atividades() {
  const [entries, setEntries] = useState<FitnessEntryLocal[]>([]);
  const [range, setRange] = useState<Partial<{ from: Date; to: Date }> | undefined>(undefined);

  useEffect(() => setPageSEO("Atividades Físicas | Berê", "Registre exercícios por mensagem"), []);
  useEffect(() => setEntries(getActivities()), []);

  const FitnessSim = MessageSimulator<FitnessEntryLocal>;

  const periodEntries = useMemo(() => {
    const efFrom = startOfDay(range?.from ?? subDays(new Date(), 6));
    const efToEnd = addDays(startOfDay(range?.to ?? new Date()), 1);
    return entries.filter((e) => {
      const d = new Date(e.data);
      return d >= efFrom && d < efToEnd;
    });
  }, [entries, range]);

  const totals = useMemo(() => groupTotalsByModality(periodEntries), [periodEntries]);

  const modalities = useMemo(() => Array.from(new Set(periodEntries.map((e) => e.tipo?.toLowerCase() || "atividade"))), [periodEntries]);
  const series = useMemo(() => {
    const efFrom = startOfDay(range?.from ?? subDays(new Date(), 6));
    const efTo = startOfDay(range?.to ?? new Date());
    const days = eachDayOfInterval({ start: efFrom, end: efTo });
    return {
      data: days.map((day) => {
        const next = addDays(day, 1);
        const slice = periodEntries.filter((e) => {
          const d = new Date(e.data);
          return d >= day && d < next;
        });
        const row: any = { dia: format(day, "dd/MM") };
        for (const m of modalities) row[m] = 0;
        for (const e of slice) {
          const k = e.tipo?.toLowerCase() || "atividade";
          row[k] += e.minutos || 0;
        }
        return row;
      }),
      modalities,
    };
  }, [periodEntries, range, modalities]);

  const sessionsCount = periodEntries.length;
  const totalMinutes = periodEntries.reduce((s, e) => s + (e.minutos || 0), 0);
  const totalKm = periodEntries.reduce((s, e) => s + (e.distanciaKm || 0), 0);
  const totalCal = useMemo(() => totalCalories(periodEntries), [periodEntries]);
  const daysCount = (() => {
    const efFrom = startOfDay(range?.from ?? subDays(new Date(), 6));
    const efTo = startOfDay(range?.to ?? new Date());
    return differenceInCalendarDays(efTo, efFrom) + 1;
  })();
  const avgCalories = useMemo(() => Math.round(totalCal / Math.max(daysCount, 1)), [totalCal, daysCount]);
  const periodEntriesSorted = useMemo(() =>
    [...periodEntries].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [periodEntries]
  );

  const formatHm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">Atividades Físicas | Berê</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="filters" className="flex justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  {range?.from && range?.to ? `${format(range.from, "PPP")} – ${format(range.to, "PPP")}` : "Selecione o período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={range as any}
                  onSelect={(r: any) => {
                    if (r?.from && r?.to) {
                      if (range && r.from.getTime() === range.from.getTime() && r.to.getTime() === range.to.getTime()) {
                        setRange(undefined);
                      } else {
                        setRange({ from: r.from, to: r.to });
                      }
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </section>
        <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="stats" className="sr-only">Métricas</h2>
          <StatCard title="Sessões (período)" value={String(sessionsCount)} />
          <StatCard title="Tempo total (período)" value={formatHm(totalMinutes)} />
          <StatCard title="Distância total (período)" value={`${totalKm.toFixed(1)} km`} />
          <StatCard title="Calorias médias (dia)" value={`${avgCalories.toLocaleString()} kcal/dia`} />
        </section>

        <section aria-labelledby="add-message" className="grid gap-6 md:grid-cols-5">
          <h2 id="add-message" className="sr-only">Registrar por mensagem</h2>
          <div className="md:col-span-2">
            <FitnessSim
              title="Cole a mensagem (ex.: 'Corrida 30min 5km')"
              placeholder="Ex.: Corrida 30min 5km"
              parse={parseFitness}
              onConfirm={(data) => {
                save(data);
                setEntries(getActivities());
                toast({ title: "Atividade registrada" });
              }}
            />
          </div>
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Resumo (período)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground grid gap-1">
                  <li>Calorias (estimadas no período): {totalCal.toLocaleString()} kcal</li>
                  {Object.entries(totals).map(([m, t]) => (
                    <li key={m} className="capitalize">
                      {m}: {t.distanciaKm ? `${t.distanciaKm.toFixed(1)} km - ` : ""}{formatHm(t.minutos)}
                    </li>
                  ))}
                  {Object.keys(totals).length === 0 && (
                    <li>Nenhuma atividade no período.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="chart">
          <h2 id="chart" className="sr-only">Desempenho por modalidade e dia</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Minutos por dia (stack por modalidade)</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivitiesChart data={series.data} modalities={series.modalities} />
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="list">
          <h2 id="list" className="text-lg font-medium mb-3">Atividades</h2>
          <ActivitiesTable entries={periodEntriesSorted} />
        </section>
      </main>
    </div>
  );
}
