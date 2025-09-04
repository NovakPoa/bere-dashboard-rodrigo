import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthMetrics } from "@/hooks/useHealth";

interface HealthMetricsProps {
  metrics: HealthMetrics;
}

export default function HealthMetrics({ metrics }: HealthMetricsProps) {
  const formatCalories = (value: number) => Math.round(value).toLocaleString();
  
  const getBalanceColor = (balance: number) => {
    if (balance > 200) return "text-orange-600";
    if (balance < -200) return "text-green-600";
    return "text-foreground";
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `+${formatCalories(balance)} kcal`;
    return `${formatCalories(balance)} kcal`;
  };

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
      <Card className="transition-smooth hover:shadow-elegant">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Consumo Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-success">
            {formatCalories(metrics.avgConsumed)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">kcal/dia</p>
        </CardContent>
      </Card>

      <Card className="transition-smooth hover:shadow-elegant">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Gasto Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-destructive">
            {formatCalories(metrics.avgBurned)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">kcal/dia</p>
        </CardContent>
      </Card>

      <Card className="transition-smooth hover:shadow-elegant">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Balanço Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${getBalanceColor(metrics.avgBalance)}`}>
            {getBalanceText(metrics.avgBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.avgBalance > 0 ? "Superávit" : "Déficit"}
          </p>
        </CardContent>
      </Card>

      <Card className="transition-smooth hover:shadow-elegant">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {Math.abs(metrics.maxDeficit) > metrics.maxSurplus ? "Maior Déficit" : "Maior Superávit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${
            Math.abs(metrics.maxDeficit) > metrics.maxSurplus 
              ? "text-green-600" 
              : "text-orange-600"
          }`}>
            {Math.abs(metrics.maxDeficit) > metrics.maxSurplus 
              ? `${formatCalories(metrics.maxDeficit)} kcal`
              : `+${formatCalories(metrics.maxSurplus)} kcal`
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">em {metrics.totalDays} dias</p>
        </CardContent>
      </Card>
    </div>
  );
}