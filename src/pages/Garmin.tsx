import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchGarminActivities, GarminActivity } from "@/lib/garmin";
import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, startOfDay, subDays, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GarminChart from "@/components/fitness/GarminChart";
import GarminActivitiesTable from "@/components/fitness/GarminActivitiesTable";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateRangePicker } from "@/components/habits/DateRangePicker";
import StatCard from "@/components/finance/StatCard";
import GarminSyncStatus from "@/components/fitness/GarminSyncStatus";

export default function Garmin() {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  // SEO
  useEffect(() => {
    document.title = "Garmin - Atividades Sincronizadas";
  }, []);

  const efFrom = startOfDay(startDate);
  const efTo = startOfDay(endDate);

  const { data: allEntries = [], isLoading, refetch } = useQuery<GarminActivity[]>({
    queryKey: ['garmin-activities', efFrom, efTo],
    queryFn: async () => {
      return await fetchGarminActivities(efFrom, efTo);
    },
  });

  // Real-time listener for garmin_activities table
  useEffect(() => {
    const channel = supabase
      .channel('garmin-activities-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'garmin_activities'
        },
        (payload) => {
          console.log('Change received!', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Manual sync function
  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('terra-garmin-sync');
      
      if (error) {
        toast.error('Erro na sincronização: ' + error.message);
      } else {
        toast.success(`Sincronização concluída - ${data?.processed || 0} atividades processadas`);
        refetch();
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Falha ao sincronizar dados do Garmin');
    } finally {
      setSyncLoading(false);
    }
  };

  const availableModalities = useMemo(() => {
    const modalities = [...new Set(allEntries.map(e => e.activity_type).filter(Boolean))];
    return modalities.map(modality => ({
      value: modality,
      label: modality.charAt(0).toUpperCase() + modality.slice(1)
    }));
  }, [allEntries]);

  const periodEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (selectedModalities.length > 0 && !selectedModalities.includes(entry.activity_type)) {
        return false;
      }
      return true;
    });
  }, [allEntries, selectedModalities]);

  const series = useMemo(() => {
    // Group activities by date and modality for charting
    const dataByDate: Record<string, Record<string, number>> = {};
    
    periodEntries.forEach(entry => {
      const date = format(new Date(entry.start_time), 'dd/MM');
      const modality = entry.activity_type;
      const minutes = entry.duration_sec ? Math.round(entry.duration_sec / 60) : 0;
      
      if (!dataByDate[date]) {
        dataByDate[date] = {};
      }
      
      dataByDate[date][modality] = (dataByDate[date][modality] || 0) + minutes;
    });
    
    const data = Object.entries(dataByDate).map(([date, modalities]) => ({
      data: date,
      ...modalities
    }));
    
    const modalities = [...new Set(periodEntries.map(e => e.activity_type))];
    
    return { data, modalities };
  }, [periodEntries]);

  // Summary stats
  const sessionsCount = periodEntries.length;
  const totalMinutes = periodEntries.reduce((acc, entry) => acc + (entry.duration_sec ? Math.round(entry.duration_sec / 60) : 0), 0);
  const totalKm = periodEntries.reduce((acc, entry) => acc + (entry.distance_km || 0), 0);
  const totalCal = periodEntries.reduce((acc, entry) => acc + (entry.calories || 0), 0);

  const formatHm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  const daysCount = (() => {
    const efFrom = startOfDay(startDate);
    const efTo = startOfDay(endDate);
    return differenceInCalendarDays(efTo, efFrom) + 1;
  })();
  
  // Garantir que avgCalories seja sempre um número válido
  const avgCalories = useMemo(() => {
    const avg = totalCal / Math.max(daysCount, 1);
    return isNaN(avg) || !isFinite(avg) ? 0 : Math.round(avg);
  }, [totalCal, daysCount]);
  
  const periodEntriesSorted = useMemo(() =>
    [...periodEntries].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()),
    [periodEntries]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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

        {allEntries.length === 0 ? (
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