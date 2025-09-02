import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddFoodEntry } from "@/hooks/useNutrition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Camera, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  mealType: z.enum(["café da manhã", "almoço", "lanche", "jantar"]),
  calories: z.number().min(0, "Calorias devem ser positivas"),
  protein: z.number().min(0, "Proteínas devem ser positivas"),
  carbs: z.number().min(0, "Carboidratos devem ser positivos"),
  fat: z.number().min(0, "Gorduras devem ser positivas"),
  date: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface AddMealDialogProps {}

export default function AddMealDialog({}: AddMealDialogProps) {
  const [activeTab, setActiveTab] = useState("manual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const { toast } = useToast();
  const addFoodEntry = useAddFoodEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      mealType: "almoço",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
      });
      reader.readAsDataURL(selectedFile);
      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64 }
      });

      if (error) throw error;

      // Preencher o formulário com os dados da IA
      form.setValue("description", data.description);
      form.setValue("mealType", data.mealType);
      form.setValue("calories", data.calories);
      form.setValue("protein", data.protein);
      form.setValue("carbs", data.carbs);
      form.setValue("fat", data.fat);

      // Mudar para a aba manual para permitir edição
      setActiveTab("manual");
      
      toast({
        title: "Análise concluída!",
        description: "Dados preenchidos automaticamente. Revise e ajuste se necessário.",
      });
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar a imagem. Tente inserir manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeText = async () => {
    const description = form.getValues("description");
    if (!description.trim()) {
      toast({
        title: "Descrição vazia",
        description: "Digite uma descrição dos alimentos para analisar.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { textDescription: description }
      });

      if (error) throw error;

      // Preencher o formulário com os dados da IA
      form.setValue("description", data.description);
      form.setValue("mealType", data.mealType);
      form.setValue("calories", data.calories);
      form.setValue("protein", data.protein);
      form.setValue("carbs", data.carbs);
      form.setValue("fat", data.fat);

      toast({
        title: "Análise concluída!",
        description: "Valores estimados automaticamente. Revise e ajuste se necessário.",
      });
    } catch (error) {
      console.error('Erro ao analisar texto:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar a descrição. Verifique o texto e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingText(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar refeições.",
          variant: "destructive",
        });
        return;
      }

      const foodEntry = {
        description: data.description,
        mealType: data.mealType,
        meal_type: data.mealType,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        date: data.date,
        user_id: session.user.id,
      };

      await addFoodEntry.mutateAsync(foodEntry);
      
      toast({
        title: "Refeição adicionada",
        description: "Sua refeição foi salva com sucesso!",
      });

      form.reset();
      setActiveTab("manual");
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a refeição.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="px-4 pb-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="photo">Foto</TabsTrigger>
        </TabsList>

        <TabsContent value="photo" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {!previewUrl ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">
                      Clique para selecionar uma foto da refeição
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={analyzeImage}
                      disabled={isAnalyzing}
                      className="flex-1"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      {isAnalyzing ? "Analisando..." : "Analisar com IA"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl("");
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Refeição</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="café da manhã">Café da Manhã</SelectItem>
                        <SelectItem value="almoço">Almoço</SelectItem>
                        <SelectItem value="lanche">Lanche</SelectItem>
                        <SelectItem value="jantar">Jantar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: 2 colheres de sopa de arroz e uma colher de sopa de feijão"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={analyzeText}
                  disabled={isAnalyzingText || !form.watch("description")?.trim()}
                  className="gap-2"
                >
                  {isAnalyzingText ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzingText ? "Analisando..." : "Estimar com IA"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calorias (kcal)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
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
                  name="protein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteínas (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
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
                  name="carbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carboidratos (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
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
                  name="fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gorduras (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </DrawerClose>
                <DrawerClose asChild>
                  <Button type="submit" className="flex-1">
                    Salvar
                  </Button>
                </DrawerClose>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}