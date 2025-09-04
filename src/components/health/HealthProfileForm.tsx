import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile, useUpdateProfile, calculateBMR, type Profile } from "@/hooks/useProfile";

const healthProfileSchema = z.object({
  height: z.number().min(100, "Altura deve ser pelo menos 100cm").max(250, "Altura deve ser no máximo 250cm"),
  weight: z.number().min(30, "Peso deve ser pelo menos 30kg").max(300, "Peso deve ser no máximo 300kg"),
  age: z.number().min(10, "Idade deve ser pelo menos 10 anos").max(120, "Idade deve ser no máximo 120 anos"),
  gender: z.enum(["masculino", "feminino"], { required_error: "Selecione o gênero" }),
  activity_level: z.enum(["sedentario", "levemente_ativo", "moderadamente_ativo", "muito_ativo", "super_ativo"], {
    required_error: "Selecione o nível de atividade"
  }),
});

type HealthProfileFormData = z.infer<typeof healthProfileSchema>;

export default function HealthProfileForm() {
  const [open, setOpen] = useState(false);
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<HealthProfileFormData>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      height: profile?.height || undefined,
      weight: profile?.weight || undefined,
      age: profile?.age || undefined,
      gender: profile?.gender || undefined,
      activity_level: profile?.activity_level || undefined,
    },
  });

  const watchedValues = form.watch();
  const metabolicRates = calculateBMR({
    ...profile,
    ...watchedValues,
  } as Profile);

  const onSubmit = async (data: HealthProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      setOpen(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
    }
  };

  const activityLevels = [
    { value: "sedentario", label: "Sedentário (pouco ou nenhum exercício)" },
    { value: "levemente_ativo", label: "Levemente ativo (exercício leve 1-3 dias/semana)" },
    { value: "moderadamente_ativo", label: "Moderadamente ativo (exercício moderado 3-5 dias/semana)" },
    { value: "muito_ativo", label: "Muito ativo (exercício intenso 6-7 dias/semana)" },
    { value: "super_ativo", label: "Super ativo (exercício muito intenso, trabalho físico)" },
  ];

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <User className="mr-2 h-4 w-4" />
        Carregando...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <User className="mr-2 h-4 w-4" />
          Meu Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meu Perfil de Saúde</DialogTitle>
          <DialogDescription>
            Preencha suas informações para calcular sua taxa metabólica basal (TMB) e gasto energético diário.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="170"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="70"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="activity_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Atividade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu nível de atividade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {metabolicRates && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Seus Valores Calculados</CardTitle>
                  <CardDescription>
                    Baseado nas informações fornecidas
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{metabolicRates.bmr}</div>
                    <div className="text-sm text-muted-foreground">TMB (kcal/dia)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Taxa Metabólica Basal
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{metabolicRates.tdee}</div>
                    <div className="text-sm text-muted-foreground">GEET (kcal/dia)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Gasto Energético Total
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}