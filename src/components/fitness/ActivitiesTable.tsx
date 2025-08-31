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
      <CardContent className="px-2 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Data</TableHead>
                <TableHead className="min-w-[100px]">Modalidade</TableHead>
                <TableHead className="text-right min-w-[80px]">Distância</TableHead>
                <TableHead className="text-right min-w-[80px]">Duração</TableHead>
                <TableHead className="text-right min-w-[80px]">Calorias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e, idx) => (
                <TableRow key={e.data + idx}>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                    {new Date(e.data).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="capitalize text-xs sm:text-sm">{e.tipo || "atividade"}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{(e.distanciaKm ?? 0).toFixed(1)} km</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{fmtHm(e.minutos || 0)}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">{((e.calorias ?? estimateCalories(e)) || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
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
