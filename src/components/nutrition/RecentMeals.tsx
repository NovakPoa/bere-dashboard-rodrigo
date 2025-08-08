
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FoodEntry = {
  descricao: string;
  refeicao: string;
  calorias: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number;
  data: string;
};

interface RecentMealsProps {
  entries: FoodEntry[];
  dateRange?: { from: Date; to: Date };
}

export default function RecentMeals({ entries, dateRange }: RecentMealsProps) {
  const filteredEntries = entries
    .filter(entry => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const entryDate = new Date(entry.data);
      return entryDate >= dateRange.from && entryDate <= dateRange.to;
    })
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Refeições recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Refeição</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Calorias</TableHead>
              <TableHead className="text-right">Proteínas (g)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma refeição encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(entry.data), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="capitalize">{entry.refeicao}</TableCell>
                  <TableCell className="max-w-48 truncate">{entry.descricao}</TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.calorias.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.proteinas_g}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
