import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Timer, MapPin, Zap } from "lucide-react";
import { FitnessEntry } from "@/lib/fitness";

interface GarminActivitiesTableProps {
  entries: FitnessEntry[];
}

export default function GarminActivitiesTable({ entries }: GarminActivitiesTableProps) {
  const getActivityIcon = (tipo: string) => {
    const lowerTipo = tipo.toLowerCase();
    if (lowerTipo.includes('run')) return <Activity className="h-4 w-4" />;
    if (lowerTipo.includes('cycl') || lowerTipo.includes('bike')) return <MapPin className="h-4 w-4" />;
    if (lowerTipo.includes('swim')) return <Zap className="h-4 w-4" />;
    return <Timer className="h-4 w-4" />;
  };

  const getActivityVariant = (tipo: string) => {
    const lowerTipo = tipo.toLowerCase();
    if (lowerTipo.includes('run')) return "default";
    if (lowerTipo.includes('cycl') || lowerTipo.includes('bike')) return "secondary";
    if (lowerTipo.includes('swim')) return "outline";
    return "default";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatPace = (distanceKm: number, minutes: number) => {
    if (!distanceKm || distanceKm === 0) return null;
    const paceMinPerKm = minutes / distanceKm;
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`;
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma atividade encontrada no período selecionado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Histórico de Atividades - Garmin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {getActivityIcon(entry.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActivityVariant(entry.tipo)} className="text-xs">
                      {entry.tipo.replace('terra-', '').replace('garmin-', '')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.data), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDuration(entry.minutos)}</span>
                    </div>
                    
                    {entry.distanciaKm && entry.distanciaKm > 0 && (
                      <>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{entry.distanciaKm.toFixed(2)} km</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <span>{formatPace(entry.distanciaKm, entry.minutos)}</span>
                        </div>
                      </>
                    )}
                    
                    {entry.calorias && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span>{entry.calorias} cal</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 sm:mt-0 sm:ml-4 text-right">
                <div className="text-sm font-medium">
                  {format(new Date(entry.data), "HH:mm")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(entry.data), "EEE", { locale: ptBR })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}