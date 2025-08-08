import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";
import { MessageSimulator } from "@/components/common/MessageSimulator";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "study_sessions_v1";

type StudyEntry = {
  materia: string;
  minutos: number;
  nota?: string;
  data: string;
};

const parseStudy = (msg: string): StudyEntry | null => {
  const lower = msg.toLowerCase();
  if (!lower.trim()) return null;
  const minMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(min|m|minutos|h|hora|horas)/);
  let minutos = 0;
  if (minMatch) {
    const val = parseFloat(minMatch[1].replace(",", "."));
    const unit = minMatch[2];
    minutos = /h|hora/.test(unit) ? Math.round(val * 60) : Math.round(val);
  }
  // matéria: após o tempo, resto; fallback "simulado" se contém
  let materia = "matéria";
  if (/simulado/.test(lower)) materia = "simulado";
  else {
    const parts = lower.split(minMatch?.[0] || "").map((p) => p.trim()).filter(Boolean);
    if (parts[1]) materia = parts[1];
    else if (parts[0]) materia = parts[0];
  }
  return { materia, minutos, nota: msg, data: new Date().toISOString() };
};

function save(entry: StudyEntry) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as StudyEntry[];
  all.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export default function Estudos() {
  useEffect(() => setPageSEO("Estudos | Berê", "Registre estudo por mensagem"), []);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Estudos</h1>
      </header>

      <section>
        <MessageSimulator<StudyEntry>
          title="Cole a mensagem (ex.: '2h Matemática' ou '30min Simulado')"
          placeholder="Ex.: 2h Matemática"
          parse={parseStudy}
          onConfirm={(data) => {
            save(data);
            toast({ title: "Estudo registrado" });
          }}
        />
      </section>
    </main>
  );
}
