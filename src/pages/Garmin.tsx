import { useEffect, useMemo, useState } from "react";
import { format, eachDayOfInterval, startOfDay, addDays, differenceInCalendarDays, subDays, startOfMonth } from "date-fns";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import StatCard from "@/components/finance/StatCard";
import DateRangePicker from "@/components/finance/DateRangePicker";
import { MultiSelect } from "@/components/ui/multi-select";
import GarminActivitiesTable from "@/components/fitness/GarminActivitiesTable";
import GarminChart from "@/components/fitness/GarminChart";
import GarminSyncStatus from "@/components/fitness/GarminSyncStatus";
import { FitnessEntry, groupTotalsByModality, totalCalories, fetchActivitiesFromSupabase } from "@/lib/fitness";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Garmin() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => setPageSEO("Garmin - Atividades Sincronizadas", "Visualize suas atividades sincronizadas do Garmin"), []);

  const efFrom = startOfDay(startDate ?? startOfMonth(new Date()));
  const efTo = startOfDay(endDate ?? new Date());
  
  // Buscar apenas atividades com origem = 'garmin'
  const { data: dbEntries, isLoading, error } = useQuery({
    queryKey: ["garmin-activities", efFrom.toISOString(), efTo.toISOString()],
    queryFn: async () => {
      const activities = await fetchActivitiesFromSupabase(efFrom, efTo);
      return activities.filter(activity => 
        // Verifica atividades com origem 'garmin' 
        activity.tipo?.includes('garmin') ||
        ['corrida', 'ciclismo', 'natacao', 'musculacao', 'caminhada', 'yoga'].includes(activity.tipo?.toLowerCase())
      );
    },
  });
  
  const entries = (dbEntries as FitnessEntry[] | undefined) ?? [];

  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("garmin-activities-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividade_fisica" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["garmin-activities"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atividade_fisica" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["garmin-activities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Trigger manual sync
  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("terra-garmin-sync");
      
      if (error) {
        toast({
          title: "Erro na sincronização",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sincronização concluída",
          description: `${data?.processed || 0} atividades processadas`,
        });
        queryClient.invalidateQueries({ queryKey: ["garmin-activities"] });
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar dados do Garmin",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Get available modalities for filter options
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
  
  // Garantir que avgCalories seja sempre um número válido
  const avgCalories = useMemo(() => {
    const avg = totalCal / Math.max(daysCount, 1);
    return isNaN(avg) || !isFinite(avg) ? 0 : Math.round(avg);
  }, [totalCal, daysCount]);
  
  const periodEntriesSorted = useMemo(() =>
    [...periodEntries].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [periodEntries]
  );

  const formatHm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando dados do Garmin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="container px-4 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground">Garmin</h1>
            <p className="text-muted-foreground mt-1">Atividades sincronizadas do seu dispositivo</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleManualSync}
            disabled={syncLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        <GarminSyncStatus />
        
        <section aria-labelledby="filters" className="flex flex-col lg:flex-row gap-4 lg:justify-between lg:items-start">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
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
          </div>
        </section>

        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">Nenhuma atividade do Garmin encontrada</p>
                <p className="text-sm">Certifique-se de que seu dispositivo está conectado e sincronizado</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section aria-labelledby="stats" className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <h2 id="stats" className="sr-only">Métricas do Garmin</h2>
              <StatCard title="Sessões/dia" value={(sessionsCount / Math.max(daysCount, 1)).toFixed(0)} />
              <StatCard title="Tempo/dia" value={formatHm(Math.round(totalMinutes / Math.max(daysCount, 1)))} />
              <StatCard title="Distância/dia" value={`${(totalKm / Math.max(daysCount, 1)).toFixed(1)} km`} />
              <StatCard title="Calorias/dia" value={`${avgCalories}`} />
            </section>

            <section aria-labelledby="chart">
              <h2 id="chart" className="sr-only">Performance do Garmin por modalidade e dia</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Minutos por dia - Dados do Garmin</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="h-[300px] w-full">
                    <GarminChart data={series.data} modalities={series.modalities} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="list">
              <h2 id="list" className="text-lg font-medium mb-3">Atividades do Garmin</h2>
              <GarminActivitiesTable entries={periodEntriesSorted} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}