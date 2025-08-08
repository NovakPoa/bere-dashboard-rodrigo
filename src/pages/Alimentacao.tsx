
import { useEffect, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import NutritionCharts from "@/components/nutrition/NutritionCharts";
import RecentMeals from "@/components/nutrition/RecentMeals";

const STORAGE_KEY = "food_diary_v1";

type FoodEntry = {
  descricao: string;
  refeicao: string;
  calorias: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  data: string;
};

const parseFood = (msg: string): FoodEntry | null => {
  const lower = msg.toLowerCase();
  if (!lower.trim()) return null;
  // simples: tenta extrair refeição
  const refeicoes = ["café da manhã", "cafe da manha", "almoço", "almoco", "jantar", "lanche"];
  const refeicao = refeicoes.find((r) => lower.includes(r)) || "refeição";
  return {
    descricao: msg.trim(),
    refeicao,
    calorias: 500,
    proteinas_g: 20,
    carboidratos_g: 60,
    gorduras_g: 15,
    data: new Date().toISOString(),
  };
};

function save(entry: FoodEntry) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as FoodEntry[];
  all.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getFoodEntries(): FoodEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function Alimentacao() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [range, setRange] = useState<Partial<{ from: Date; to: Date }> | undefined>(
    () => ({ from: subDays(new Date(), 6), to: new Date() })
  );
  const fieldsRef = useRef<Partial<FoodEntry>>({});

  useEffect(() => setPageSEO("Alimentação | Berê", "Registre refeições por texto ou foto"), []);
  useEffect(() => setEntries(getFoodEntries()), []);

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
    let base: Pick<FoodEntry, "calorias" | "proteinas_g" | "carboidratos_g" | "gorduras_g"> = {
      calorias: 500,
      proteinas_g: 20,
      carboidratos_g: 60,
      gorduras_g: 15,
    };
    if (/(salada|salad)/.test(name)) base = { calorias: 250, proteinas_g: 10, carboidratos_g: 20, gorduras_g: 12 };
    if (/(pizza)/.test(name)) base = { calorias: 750, proteinas_g: 28, carboidratos_g: 85, gorduras_g: 30 };
    if (/(frango|chicken)/.test(name)) base = { calorias: 420, proteinas_g: 35, carboidratos_g: 10, gorduras_g: 18 };

    const entry: FoodEntry = {
      descricao: "Estimado pela foto",
      refeicao: "refeição",
      data: new Date().toISOString(),
      ...base,
    };

    fieldsRef.current = entry;
    toast({ title: "Estimativa pronta", description: "Revise os valores e salve." });
  };

  const saveFromFields = () => {
    const f = fieldsRef.current;
    if (!f || !f.descricao) {
      toast({ title: "Complete os campos", variant: "destructive" });
      return;
    }
    const entry: FoodEntry = {
      descricao: f.descricao!,
      refeicao: (f.refeicao as string) || "refeição",
      calorias: Number(f.calorias ?? 0),
      proteinas_g: Number(f.proteinas_g ?? 0),
      carboidratos_g: Number(f.carboidratos_g ?? 0),
      gorduras_g: Number(f.gorduras_g ?? 0),
      data: new Date().toISOString(),
    };
    save(entry);
    setEntries(getFoodEntries());
    toast({ title: "Refeição registrada" });
  };

  const periods = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 15 dias", days: 15 },
    { label: "Último mês", days: 30 },
    { label: "Últimos 3 meses", days: 90 },
  ];

  const handlePeriodChange = (days: number, label: string) => {
    const currentPeriod = range?.from && range?.to ? 
      Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 7;
    
    if (currentPeriod === days) {
      // Deselect if same period
      setRange({ from: subDays(new Date(), 6), to: new Date() });
    } else {
      setRange({
        from: subDays(new Date(), days - 1),
        to: new Date(),
      });
    }
  };

  const getCurrentPeriodLabel = () => {
    if (!range?.from || !range?.to) return "Últimos 7 dias";
    const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const period = periods.find(p => p.days === days);
    return period?.label || "Período personalizado";
  };

  // Campos editáveis tipados
  const editorFields = [
    ["descricao", "Descrição"],
    ["refeicao", "Refeição"],
    ["calorias", "Calorias (kcal)"],
    ["proteinas_g", "Proteínas (g)"],
    ["carboidratos_g", "Carboidratos (g)"],
    ["gorduras_g", "Gorduras (g)"],
  ] as const satisfies ReadonlyArray<readonly [keyof FoodEntry, string]>;

  const FoodSim = MessageSimulator<FoodEntry>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alimentação</h1>
          <p className="text-muted-foreground">Registre refeições e monitore nutrição</p>
        </div>
        <div className="flex gap-2">
          {periods.map((period) => (
            <Button
              key={period.days}
              variant="outline"
              size="sm"
              onClick={() => handlePeriodChange(period.days, period.label)}
              className={cn(
                range?.from && range?.to &&
                Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1 === period.days &&
                "bg-primary text-primary-foreground"
              )}
            >
              {period.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {getCurrentPeriodLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <NutritionCharts entries={entries} dateRange={range as { from: Date; to: Date }} />

      <section className="grid gap-4 lg:grid-cols-2">
        <FoodSim
          title="Cole a mensagem (ex.: 'Almoço: frango com arroz')"
          placeholder="Ex.: Almoço: frango com arroz"
          parse={parseFood}
          onConfirm={(data) => {
            save(data);
            setEntries(getFoodEntries());
            toast({ title: "Refeição registrada" });
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

      <RecentMeals entries={entries} dateRange={range as { from: Date; to: Date }} />
    </div>
  );
}
