import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";

export default function Cultura() {
  useEffect(() => setPageSEO("Cultura | Berê", "Listas de filmes, séries e livros"), []);
  return (
    <main>
      <h1 className="text-2xl font-semibold">Cultura</h1>
      <p className="text-muted-foreground mt-2">MVP em breve: visto/lido, fila e recomendações.</p>
    </main>
  );
}
