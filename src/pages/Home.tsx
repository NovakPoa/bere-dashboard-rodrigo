import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setPageSEO } from "@/lib/seo";
import { Link } from "react-router-dom";

export default function Home() {
  useEffect(() => {
    setPageSEO("Principal", "Resumo dos últimos 7 dias");
  }, []);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Página principal</h1>
      </header>
      <div className="text-sm">
        <Link to="/auth" className="underline underline-offset-4">Ir para autenticação</Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Calorias consumidas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">— kcal</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Calorias gastas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">— kcal</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">% hábitos feitos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">— %</CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Valor gasto por categoria (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>—</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">To‑do mais prioritária</CardTitle>
          </CardHeader>
          <CardContent>—</CardContent>
        </Card>
      </section>
    </main>
  );
}
