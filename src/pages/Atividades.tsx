import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import StatCard from "@/components/finance/StatCard";
import ActivitiesChart from "@/components/fitness/ActivitiesChart";
import { FitnessEntry, getActivities, lastNDays, groupTotalsByModality, dailySeriesMinutes, totalCalories } from "@/lib/fitness";
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
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  useEffect(() => setPageSEO("Atividades Físicas | Berê", "Registre exercícios por mensagem"), []);
  useEffect(() => setEntries(getActivities()), []);

  const FitnessSim = MessageSimulator<FitnessEntryLocal>;

  const last7 = useMemo(() => lastNDays(entries, 7, baseDate), [entries, baseDate]);
  const totals = useMemo(() => groupTotalsByModality(last7), [last7]);
  const series = useMemo(() => dailySeriesMinutes(last7), [last7]);
  const sessionsCount = last7.length;
  const totalMinutes = last7.reduce((s, e) => s + (e.minutos || 0), 0);
  const totalKm = last7.reduce((s, e) => s + (e.distanciaKm || 0), 0);
  const totalCal = useMemo(() => totalCalories(last7), [last7]);
  const avgCalories = useMemo(() => {
    const total = totalCal;
    return Math.round(total / 7);
  }, [totalCal]);

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
            <span className="text-sm text-muted-foreground">Data base</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  {format(baseDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={baseDate}
                  onSelect={(d) => d && setBaseDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </section>
        <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="stats" className="sr-only">Métricas</h2>
          <StatCard title="Sessões (7d)" value={String(sessionsCount)} />
          <StatCard title="Tempo total (7d)" value={formatHm(totalMinutes)} />
          <StatCard title="Distância total (7d)" value={`${totalKm.toFixed(1)} km`} />
          <StatCard title="Calorias médias (7d)" value={`${avgCalories.toLocaleString()} kcal/dia`} />
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
                <CardTitle className="text-sm text-muted-foreground">Resumo (7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground grid gap-1">
                  <li>Calorias (estimadas 7d): {totalCal.toLocaleString()} kcal</li>
                  {Object.entries(totals).map(([m, t]) => (
                    <li key={m} className="capitalize">
                      {m}: {t.distanciaKm ? `${t.distanciaKm.toFixed(1)} km - ` : ""}{formatHm(t.minutos)}
                    </li>
                  ))}
                  {Object.keys(totals).length === 0 && (
                    <li>Nenhuma atividade nos últimos 7 dias.</li>
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
      </main>
    </div>
  );
}
