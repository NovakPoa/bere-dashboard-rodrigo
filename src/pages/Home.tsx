import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setPageSEO } from "@/lib/seo";
import { Link } from "react-router-dom";
import { useDashboardStats, useTopPriorityTodo } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: topTodo, isLoading: todoLoading } = useTopPriorityTodo();

  useEffect(() => {
    setPageSEO("Principal", "Resumo dos últimos 7 dias");
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Página principal</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Calorias consumidas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              `${formatNumber(stats?.caloriasConsumidas || 0)} kcal`
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Calorias gastas (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              `${formatNumber(stats?.caloriasGastas || 0)} kcal`
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">% hábitos feitos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              `${stats?.percentualHabitos || 0}%`
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Valor gasto por categoria (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                {Object.entries(stats?.gastosPorCategoria || {}).length === 0 ? (
                  <p className="text-muted-foreground">Nenhum gasto registrado</p>
                ) : (
                  Object.entries(stats?.gastosPorCategoria || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([categoria, valor]) => (
                      <div key={categoria} className="flex justify-between">
                        <span className="text-sm">{categoria}</span>
                        <span className="text-sm font-medium">{formatCurrency(valor)}</span>
                      </div>
                    ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">To‑do mais prioritária</CardTitle>
          </CardHeader>
          <CardContent>
            {todoLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <p className="text-sm line-clamp-3">{topTodo}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
