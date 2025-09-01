import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DrawerClose } from "@/components/ui/drawer";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { estimateCalories } from "@/lib/fitness";
import { useToast } from "@/hooks/use-toast";

const activityTypes = [
  "corrida",
  "natação", 
  "ciclismo",
  "musculação",
  "caminhada",
  "jiu-jitsu",
  "yoga",
  "pilates",
  "crossfit",
  "futebol",
  "basquete",
  "vôlei",
  "tênis",
  "dança",
  "outro"
];

export default function AddActivityForm() {
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setActivityType("");
    setDuration("");
    setDistance("");
    setDate(new Date());
  };

  const handleSubmit = async () => {
    if (!activityType || !duration) {
      toast({
        title: "Campos obrigatórios",
        description: "Tipo de atividade e duração são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: "Duração inválida",
        description: "A duração deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para registrar atividades.",
          variant: "destructive",
        });
        return;
      }

      const distanceNum = distance ? parseFloat(distance.replace(",", ".")) : null;
      const entry = {
        tipo: activityType,
        minutos: durationNum,
        distanciaKm: distanceNum,
        data: date.toISOString(),
      };
      
      const payload = {
        modalidade: activityType,
        tipo: activityType,
        distancia_km: distanceNum,
        duracao_min: durationNum,
        calorias: estimateCalories(entry),
        data: date.toISOString().slice(0, 10),
        ts: date.toISOString(),
        user_id: session.user.id,
      };

      const { error } = await supabase.from('atividade_fisica').insert([payload]);
      
      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Atividade adicionada",
        description: "Sua atividade foi salva com sucesso!",
      });

      queryClient.invalidateQueries({ queryKey: ["activities"] });
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 pb-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="activity-type">Tipo de Atividade</Label>
        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma atividade" />
          </SelectTrigger>
          <SelectContent>
            {activityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duração (minutos)</Label>
        <Input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Ex: 30"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="distance">Distância (km)</Label>
        <Input
          id="distance"
          type="number"
          step="0.1"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="Ex: 5.2"
        />
      </div>

      <div className="space-y-2">
        <Label>Data</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2 pt-4">
        <DrawerClose asChild>
          <Button variant="outline" className="flex-1">
            Cancelar
          </Button>
        </DrawerClose>
        <DrawerClose asChild>
          <Button 
            onClick={handleSubmit} 
            className="flex-1"
            disabled={!activityType || !duration || !date || isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Adicionar"}
          </Button>
        </DrawerClose>
      </div>
    </div>
  );
}