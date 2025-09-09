import { FitnessEntry, estimateCalories } from "@/lib/fitness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRemoveActivity } from "@/hooks/useFitness";
import { UpdateActivityDialog } from "./UpdateActivityDialog";
import { toast } from "@/hooks/use-toast";
import { 
  Activity, 
  Bike, 
  Dumbbell, 
  MapPin, 
  Clock, 
  Zap, 
  Waves,
  TreePine,
  Heart,
  Footprints,
  Edit,
  Trash2
} from "lucide-react";

// Helper function for activity icons
function getActivityIcon(tipo: string) {
  const activityType = (tipo || '').toLowerCase();
  
  if (activityType.includes('corrida')) return Activity;
  if (activityType.includes('ciclismo') || activityType.includes('bike')) return Bike;
  if (activityType.includes('musculacao') || activityType.includes('peso')) return Dumbbell;
  if (activityType.includes('natacao')) return Waves;
  if (activityType.includes('caminhada')) return Footprints;
  if (activityType.includes('trilha')) return TreePine;
  if (activityType.includes('yoga') || activityType.includes('pilates')) return Heart;
  
  return Activity; // default icon
}

// Helper function for activity badge variants
function getActivityVariant(tipo: string) {
  const activityType = (tipo || '').toLowerCase();
  
  if (activityType.includes('corrida')) return 'default';
  if (activityType.includes('ciclismo')) return 'secondary';
  if (activityType.includes('musculacao')) return 'destructive';
  if (activityType.includes('natacao')) return 'outline';
  
  return 'secondary';
}

export default function ActivitiesTable({ entries, onActivityChange }: { entries: (FitnessEntry & { id: string })[]; onActivityChange?: () => void }) {
  const removeActivity = useRemoveActivity();
  const fmtHm = (mins: number) => {
    const h = Math.floor((mins || 0) / 60);
    const m = (mins || 0) % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  const formatPace = (distanceKm?: number, durationMin?: number): string => {
    if (!distanceKm || !durationMin || distanceKm === 0) return '--';
    
    const paceMinPerKm = durationMin / distanceKm;
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const handleDelete = (id: string) => {
    removeActivity.mutate(id, {
      onSuccess: () => {
        toast({ title: "Atividade excluída" });
        onActivityChange?.();
      }
    });
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-10 text-sm">
            Ainda não há atividades. Clique no "+" para adicionar a primeira.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Atividades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry, idx) => {
          const IconComponent = getActivityIcon(entry.tipo || '');
          const calories = entry.calorias ?? estimateCalories(entry);
          
          return (
            <Card key={entry.data + idx} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getActivityVariant(entry.tipo || '')} className="text-xs">
                        {entry.tipo || 'atividade'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{fmtHm(entry.minutos || 0)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{(entry.distanciaKm ?? 0).toFixed(1)} km</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span>{formatPace(entry.distanciaKm, entry.minutos)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span>{(calories || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <UpdateActivityDialog activity={entry} onUpdated={() => onActivityChange?.()}>
                      <Button variant="ghost" size="sm" aria-label="Editar" className="h-8 w-8 p-0">
                        <Edit className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </UpdateActivityDialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      aria-label="Excluir" 
                      onClick={() => handleDelete(entry.id)} 
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
