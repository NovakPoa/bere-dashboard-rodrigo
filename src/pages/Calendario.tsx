import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";

export default function Calendario() {
  useEffect(() => setPageSEO("Calendário | Berê", "Integração com Google Agenda (leitura)"), []);
  return (
    <main>
      <h1 className="text-2xl font-semibold">Calendário</h1>
      <p className="text-muted-foreground mt-2">Conexão com Google Agenda (somente leitura) em breve.</p>
    </main>
  );
}
