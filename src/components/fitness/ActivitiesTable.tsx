import { FitnessEntry, estimateCalories } from "@/lib/fitness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ActivitiesTable({ entries }: { entries: FitnessEntry[] }) {
  const rows = entries;
  const fmtHm = (mins: number) => {
    const h = Math.floor((mins || 0) / 60);
    const m = (mins || 0) % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Atividades recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead className="text-right">Distância</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead className="text-right">Calorias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e, idx) => (
                <TableRow key={e.data + idx}>
                  <TableCell className="text-muted-foreground">{new Date(e.data).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{e.tipo || "atividade"}</TableCell>
                  <TableCell className="text-right">{(e.distanciaKm ?? 0).toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{fmtHm(e.minutos || 0)}</TableCell>
                  <TableCell className="text-right">{((e.calorias ?? estimateCalories(e)) || 0).toLocaleString()} kcal</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Ainda não há atividades. Cole uma mensagem para adicionar a primeira.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
