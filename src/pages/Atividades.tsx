import { useEffect, useMemo, useState } from "react";
import { format, eachDayOfInterval, startOfDay, addDays, differenceInCalendarDays, subDays } from "date-fns";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import StatCard from "@/components/finance/StatCard";
import ActivitiesChart from "@/components/fitness/ActivitiesChart";
import ActivitiesTable from "@/components/fitness/ActivitiesTable";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { FitnessEntry, groupTotalsByModality, totalCalories, fetchActivitiesFromSupabase, estimateCalories } from "@/lib/fitness";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const [startDate, setStartDate] = useState<Date | undefined>(() => subDays(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());

  useEffect(() => setPageSEO("Atividades Físicas", "Registre exercícios por mensagem"), []);

  const efFrom = startOfDay(startDate ?? subDays(new Date(), 6));
  const efTo = startOfDay(endDate ?? new Date());
  const { data: dbEntries, isLoading, error } = useQuery({
    queryKey: ["activities", efFrom.toISOString(), efTo.toISOString()],
    queryFn: () => fetchActivitiesFromSupabase(efFrom, efTo),
  });
  const entries = (dbEntries as FitnessEntryLocal[] | undefined) ?? [];

  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("atividade_fisica-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividade_fisica" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atividade_fisica" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "atividade_fisica" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const FitnessSim = MessageSimulator<FitnessEntryLocal>;

  const periodEntries = useMemo(() => {
    const efFrom = startOfDay(startDate ?? subDays(new Date(), 6));
    const efToEnd = addDays(startOfDay(endDate ?? new Date()), 1);
    return entries.filter((e) => {
      const d = new Date(e.data);
      return d >= efFrom && d < efToEnd;
    });
  }, [entries, startDate, endDate]);

  const totals = useMemo(() => groupTotalsByModality(periodEntries), [periodEntries]);

  const modalities = useMemo(() => Array.from(new Set(periodEntries.map((e) => e.tipo?.toLowerCase() || "atividade"))), [periodEntries]);
  const series = useMemo(() => {
    const efFrom = startOfDay(startDate ?? subDays(new Date(), 6));
    const efTo = startOfDay(endDate ?? new Date());
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
  }, [periodEntries, startDate, endDate, modalities]);

  const sessionsCount = periodEntries.length;
  const totalMinutes = periodEntries.reduce((s, e) => s + (e.minutos || 0), 0);
  const totalKm = periodEntries.reduce((s, e) => s + (e.distanciaKm || 0), 0);
  const totalCal = useMemo(() => totalCalories(periodEntries), [periodEntries]);
  const daysCount = (() => {
    const efFrom = startOfDay(startDate ?? subDays(new Date(), 6));
    const efTo = startOfDay(endDate ?? new Date());
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
      <header className="container px-4 py-6">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground">Atividades Físicas</h1>
      </header>

      <main className="container px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        <section aria-labelledby="filters" className="flex justify-end">
          <div className="w-full max-w-lg">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </section>
        <section aria-labelledby="stats" className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="stats" className="sr-only">Métricas</h2>
          <StatCard title="Sessões" value={String(sessionsCount)} />
          <StatCard title="Tempo total" value={formatHm(totalMinutes)} />
          <StatCard title="Distância total" value={`${totalKm.toFixed(1)} km`} />
          <StatCard title="Calorias/dia" value={`${avgCalories.toLocaleString()}`} />
        </section>

        <section aria-labelledby="add-message" className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-5">
          <h2 id="add-message" className="sr-only">Registrar por mensagem</h2>
          <div className="lg:col-span-2">
            <FitnessSim
              title="Cole a mensagem (ex.: 'Corrida 30min 5km')"
              placeholder="Ex.: Corrida 30min 5km"
              parse={parseFitness}
              onConfirm={async (data) => {
                // Get current user session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                  toast({ title: 'Erro', description: 'Você precisa estar logado para registrar atividades.', variant: 'destructive' });
                  return;
                }

                const when = data?.data ? new Date(data.data) : new Date();
                const payload = {
                  modalidade: data.tipo,
                  tipo: data.tipo,
                  distancia_km: data.distanciaKm ?? null,
                  duracao_min: data.minutos,
                  calorias: typeof data.calorias === 'number' ? data.calorias : estimateCalories(data),
                  data: when.toISOString().slice(0, 10),
                  ts: when.toISOString(),
                  user_id: session.user.id, // Include user_id for RLS
                };
                const { error } = await supabase.from('atividade_fisica').insert([payload]);
                if (error) {
                  toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
                  return;
                }
                toast({ title: 'Atividade registrada', description: 'Sua atividade foi salva no Supabase.' });
                queryClient.invalidateQueries({ queryKey: ['activities'] });
              }}
            />
          </div>
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Resumo (período)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground grid gap-1">
                  <li>Calorias (estimadas): {totalCal.toLocaleString()} kcal</li>
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
              <CardTitle className="text-sm text-muted-foreground">Minutos por dia</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[300px] w-full">
                <ActivitiesChart data={series.data} modalities={series.modalities} />
              </div>
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
