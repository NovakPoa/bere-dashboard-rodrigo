import { useEffect, useMemo, useState } from "react";
import { format, eachDayOfInterval, startOfDay, addDays, differenceInCalendarDays, subDays, startOfMonth } from "date-fns";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import StatCard from "@/components/finance/StatCard";
import ActivitiesChart from "@/components/fitness/ActivitiesChart";
import ActivitiesTable from "@/components/fitness/ActivitiesTable";
import AddActivityForm from "@/components/fitness/AddActivityForm";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { MultiSelect } from "@/components/ui/multi-select";
import { FitnessEntry, groupTotalsByModality, totalCalories, fetchActivitiesFromSupabase } from "@/lib/fitness";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Atividades() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);

  useEffect(() => setPageSEO("Atividade Física", "Registre exercícios por mensagem"), []);

  const efFrom = startOfDay(startDate ?? startOfMonth(new Date()));
  const efTo = startOfDay(endDate ?? new Date());
  const { data: dbEntries, isLoading, error } = useQuery({
    queryKey: ["activities", efFrom.toISOString(), efTo.toISOString()],
    queryFn: () => fetchActivitiesFromSupabase(efFrom, efTo),
  });
  const entries = (dbEntries as FitnessEntry[] | undefined) ?? [];

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

  

  // Get all available modalities for filter options
  const availableModalities = useMemo(() => {
    const modalities = Array.from(new Set(entries.map((e) => e.tipo?.toLowerCase() || "atividade")));
    return modalities.map(m => ({ label: m.charAt(0).toUpperCase() + m.slice(1), value: m }));
  }, [entries]);

  const periodEntries = useMemo(() => {
    const efFrom = startOfDay(startDate ?? startOfMonth(new Date()));
    const efToEnd = addDays(startOfDay(endDate ?? new Date()), 1);
    return entries.filter((e) => {
      const d = new Date(e.data);
      const inDateRange = d >= efFrom && d < efToEnd;
      const inModalityFilter = selectedModalities.length === 0 || 
        selectedModalities.includes(e.tipo?.toLowerCase() || "atividade");
      return inDateRange && inModalityFilter;
    });
  }, [entries, startDate, endDate, selectedModalities]);

  const totals = useMemo(() => groupTotalsByModality(periodEntries), [periodEntries]);

  const modalities = useMemo(() => Array.from(new Set(periodEntries.map((e) => e.tipo?.toLowerCase() || "atividade"))), [periodEntries]);
  const series = useMemo(() => {
    const efFrom = startOfDay(startDate ?? startOfMonth(new Date()));
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
    const efFrom = startOfDay(startDate ?? startOfMonth(new Date()));
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground">Atividade Física</h1>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Adicionar atividade</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>Adicionar Atividade</DrawerTitle>
                </DrawerHeader>
                <AddActivityForm />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      <main className="container px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        <section aria-labelledby="filters" className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
          <div className="flex-1 max-w-sm">
            <MultiSelect
              options={availableModalities}
              selected={selectedModalities}
              onSelectionChange={setSelectedModalities}
              placeholder="Todas as modalidades"
              label="Modalidade"
            />
          </div>
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
          <StatCard title="Sessões/dia" value={Math.round(sessionsCount / Math.max(daysCount, 1)).toString()} />
          <StatCard title="Tempo/dia" value={formatHm(Math.round(totalMinutes / Math.max(daysCount, 1)))} />
          <StatCard title="Distância/dia" value={`${(totalKm / Math.max(daysCount, 1)).toFixed(1)} km`} />
          <StatCard title="Calorias/dia" value={`${avgCalories.toLocaleString()}`} />
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
