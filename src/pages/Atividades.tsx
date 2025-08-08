import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "fitness_activities_v1";

type FitnessEntry = {
  tipo: string;
  minutos: number;
  distanciaKm?: number;
  nota?: string;
  data: string;
};

const parseFitness = (msg: string): FitnessEntry | null => {
  const lower = msg.toLowerCase();
  if (!lower.trim()) return null;
  // tipo
  const tipos = ["corrida", "natação", "natacao", "bike", "ciclismo", "musculação", "musculacao", "caminhada"];
  const tipo = tipos.find((t) => lower.includes(t)) || "atividade";
  // minutos
  const minMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(min|m|minutos|h|hora|horas)/);
  let minutos = 0;
  if (minMatch) {
    const val = parseFloat(minMatch[1].replace(",", "."));
    const unit = minMatch[2];
    minutos = /h|hora/.test(unit) ? Math.round(val * 60) : Math.round(val);
  }
  // distância km
  const distMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*km/);
  const distanciaKm = distMatch ? parseFloat(distMatch[1].replace(",", ".")) : undefined;

  if (!minutos && !distanciaKm) return { tipo, minutos: 0, data: new Date().toISOString(), nota: msg };

  return { tipo, minutos, distanciaKm, data: new Date().toISOString(), nota: msg };
};

function save(entry: FitnessEntry) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as FitnessEntry[];
  all.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export default function Atividades() {
  useEffect(() => setPageSEO("Atividades Físicas | Berê", "Registre exercícios por mensagem"), []);

  const FitnessSim = MessageSimulator<FitnessEntry>;

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Atividades Físicas</h1>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <FitnessSim
          title="Cole a mensagem (ex.: 'Corrida 30min 5km')"
          placeholder="Ex.: Corrida 30min 5km"
          parse={parseFitness}
          onConfirm={(data) => {
            save(data);
            toast({ title: "Atividade registrada" });
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Cole uma mensagem descrevendo seu treino. Você poderá ajustar manualmente antes de salvar.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
