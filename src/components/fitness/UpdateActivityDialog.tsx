import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { FitnessEntry } from "@/lib/fitness";
import { useUpdateActivity } from "@/hooks/useFitness";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  tipo: z.string().min(1, "Tipo é obrigatório"),
  minutos: z.string().min(1, "Duração é obrigatória"),
  distanciaKm: z.string().optional(),
  data: z.date({
    required_error: "Data é obrigatória",
  }),
});

interface UpdateActivityDialogProps {
  activity: FitnessEntry & { id: string };
  onUpdated: () => void;
  children: React.ReactNode;
}

const activityTypes = [
  "Corrida",
  "Caminhada", 
  "Ciclismo",
  "Natação",
  "Musculação",
  "Yoga",
  "Pilates",
  "Futebol",
  "Tênis",
  "Trilha",
  "Dança",
  "Boxe",
  "Crossfit",
  "Escalada",
  "Surf",
  "Vôlei",
  "Basquete",
  "Skate",
  "Patinação",
  "Remo"
];

export function UpdateActivityDialog({ activity, onUpdated, children }: UpdateActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const updateActivity = useUpdateActivity();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: activity.tipo,
      minutos: activity.minutos.toString(),
      distanciaKm: activity.distanciaKm ? activity.distanciaKm.toString() : "",
      data: new Date(activity.data),
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.reset({
        tipo: activity.tipo,
        minutos: activity.minutos.toString(),
        distanciaKm: activity.distanciaKm ? activity.distanciaKm.toString() : "",
        data: new Date(activity.data),
      });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const minutos = parseInt(data.minutos);
    const distanciaKm = data.distanciaKm ? parseFloat(data.distanciaKm) : 0;
    
    updateActivity.mutate(
      {
        id: activity.id,
        updates: {
          tipo: data.tipo,
          minutos,
          distanciaKm,
          data: format(data.data, "yyyy-MM-dd"),
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdated();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Atividade</DialogTitle>
          <DialogDescription>
            Faça alterações na atividade. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Atividade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minutos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distanciaKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distância (km) - opcional</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateActivity.isPending}
              >
                {updateActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}