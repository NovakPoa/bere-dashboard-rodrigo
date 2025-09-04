import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, MapPin, Zap, Heart, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GarminActivity, formatDuration, formatPace } from "@/lib/garmin";

interface GarminActivitiesTableProps {
  entries: GarminActivity[];
}

function getActivityIcon(tipo: string) {
  switch (tipo) {
    case 'corrida': return Activity;
    case 'ciclismo': return Activity;
    case 'natacao': return Activity;
    case 'caminhada': return MapPin;
    case 'musculacao': return TrendingUp;
    case 'yoga': return Heart;
    default: return Activity;
  }
}

function getActivityVariant(tipo: string): "default" | "secondary" | "destructive" | "outline" {
  switch (tipo) {
    case 'corrida': return 'default';
    case 'ciclismo': return 'secondary';
    case 'natacao': return 'outline';
    default: return 'outline';
  }
}

export default function GarminActivitiesTable({ entries }: GarminActivitiesTableProps) {
  if (!entries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma atividade do Garmin encontrada para o período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Histórico de Atividades ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => {
          const Icon = getActivityIcon(entry.activity_type);
          const startTime = new Date(entry.start_time);
          
          return (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActivityVariant(entry.activity_type)}>
                      {entry.activity_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(startTime, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(startTime, "HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(entry.duration_sec)}</span>
                </div>
                
                {entry.distance_km && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{entry.distance_km.toFixed(1)} km</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPace(entry.distance_km, entry.duration_sec)}</span>
                </div>
                
                {entry.calories && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>{Math.round(entry.calories)} cal</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}