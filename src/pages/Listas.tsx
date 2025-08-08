import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";

export default function Listas() {
  useEffect(() => setPageSEO("Listas inteligentes | Berê", "Crie listas livres"), []);
  return (
    <main>
      <h1 className="text-2xl font-semibold">Listas inteligentes</h1>
      <p className="text-muted-foreground mt-2">MVP em breve: listas personalizadas (ex.: supermercado).</p>
    </main>
  );
}
