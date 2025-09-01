import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { estimateCalories } from "@/lib/fitness";

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

interface AddActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddActivityForm({ open, onOpenChange }: AddActivityFormProps) {
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
      onOpenChange(false);
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Adicionar Atividade</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Tipo de Atividade *</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos) *</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distância (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                placeholder="Ex: 5.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                min="0"
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
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}