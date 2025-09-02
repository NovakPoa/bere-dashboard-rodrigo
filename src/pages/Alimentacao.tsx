
import { useEffect, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import RecentMeals from "@/components/nutrition/RecentMeals";
import { useFoodEntries, useAddFoodEntry, type FoodEntry } from "@/hooks/useNutrition";
import DateRangePicker from "@/components/finance/DateRangePicker";

type LegacyFoodEntry = {
  descricao: string;
  refeicao: string;
  calorias: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  data: string;
};

const parseFood = (msg: string): Omit<FoodEntry, "id"> | null => {
  const lower = msg.toLowerCase();
  if (!lower.trim()) return null;
  // simples: tenta extrair refeição
  const refeicoes = ["café da manhã", "cafe da manha", "almoço", "almoco", "jantar", "lanche"];
  const refeicao = refeicoes.find((r) => lower.includes(r)) || "café da manhã";
  return {
    description: msg.trim(),
    mealType: refeicao as FoodEntry["mealType"],
    calories: 500,
    protein: 20,
    carbs: 60,
    fat: 15,
    date: new Date().toISOString().split('T')[0],
  };
};

export default function Alimentacao() {
  const { data: entries = [] } = useFoodEntries();
  const addFoodEntry = useAddFoodEntry();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(
    () => subDays(new Date(), 6)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    () => new Date()
  );
  const fieldsRef = useRef<Partial<FoodEntry>>({});

  useEffect(() => setPageSEO("Alimentação", "Registre refeições por texto ou foto"), []);

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const estimateFromPhoto = async () => {
    if (!file) {
      toast({ title: "Envie uma foto", variant: "destructive" });
      return;
    }
    // MVP stub: heurística simples
    const name = file.name.toLowerCase();
    let base: Pick<FoodEntry, "calories" | "protein" | "carbs" | "fat"> = {
      calories: 500,
      protein: 20,
      carbs: 60,
      fat: 15,
    };
    if (/(salada|salad)/.test(name)) base = { calories: 250, protein: 10, carbs: 20, fat: 12 };
    if (/(pizza)/.test(name)) base = { calories: 750, protein: 28, carbs: 85, fat: 30 };
    if (/(frango|chicken)/.test(name)) base = { calories: 420, protein: 35, carbs: 10, fat: 18 };

    const entry: Partial<FoodEntry> = {
      description: "Estimado pela foto",
      mealType: "café da manhã",
      date: new Date().toISOString().split('T')[0],
      ...base,
    };

    fieldsRef.current = entry;
    toast({ title: "Estimativa pronta", description: "Revise os valores e salve." });
  };

  const saveFromFields = () => {
    const f = fieldsRef.current;
    if (!f || !f.description) {
      toast({ title: "Complete os campos", variant: "destructive" });
      return;
    }
    const entry: Omit<FoodEntry, "id"> = {
      description: f.description!,
      mealType: (f.mealType as FoodEntry["mealType"]) || "café da manhã",
      calories: Number(f.calories ?? 0),
      protein: Number(f.protein ?? 0),
      carbs: Number(f.carbs ?? 0),
      fat: Number(f.fat ?? 0),
      date: new Date().toISOString().split('T')[0],
    };
    addFoodEntry.mutate(entry);
  };


  // Campos editáveis tipados
  const editorFields = [
    ["description", "Descrição"],
    ["mealType", "Refeição"],
    ["calories", "Calorias (kcal)"],
    ["protein", "Proteínas (g)"],
    ["carbs", "Carboidratos (g)"],
    ["fat", "Gorduras (g)"],
  ] as const satisfies ReadonlyArray<readonly [keyof FoodEntry, string]>;

  const FoodSim = MessageSimulator<Omit<FoodEntry, "id">>;

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden">
      <header className="py-4 md:py-6">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Alimentação</h1>
      </header>

      <main className="space-y-6 md:space-y-8">
        <section aria-labelledby="filters" className="flex justify-end">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </section>

      <NutritionCharts entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />

      <section className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <FoodSim
          title="Cole a mensagem (ex.: 'Almoço: frango com arroz')"
          placeholder="Ex.: Almoço: frango com arroz"
          parse={parseFood}
          onConfirm={(data) => {
            addFoodEntry.mutate(data);
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Foto da refeição (MVP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Upload</Label>
              <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            </div>
            {preview && (
              <img src={preview} alt="foto da refeição" className="max-h-56 rounded-md object-contain" loading="lazy" />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onFile(null)}>Limpar</Button>
              <Button onClick={estimateFromPhoto}>Estimar calorias e macros</Button>
            </div>

            {/* Editor rápido */}
            <div className="grid gap-2 sm:grid-cols-2">
              {editorFields.map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input onChange={(e) => ((fieldsRef.current as any)[key] = e.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={saveFromFields}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <RecentMeals entries={entries} dateRange={startDate && endDate ? { from: startDate, to: endDate } : undefined} />
      </main>
    </div>
  );
}
