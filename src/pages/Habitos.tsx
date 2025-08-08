import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";

export default function Habitos() {
  useEffect(() => setPageSEO("Hábitos | Berê", "Acompanhe seus hábitos"), []);
  return (
    <main>
      <h1 className="text-2xl font-semibold">Hábitos</h1>
      <p className="text-muted-foreground mt-2">MVP em breve: lista de hábitos e calendário de streaks.</p>
    </main>
  );
}
