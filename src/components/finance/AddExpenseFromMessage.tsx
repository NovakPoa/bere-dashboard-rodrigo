import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseExpenseMessage } from "@/lib/finance";
import { useAddExpense } from "@/hooks/useFinance";
import { toast } from "@/hooks/use-toast";

export default function AddExpenseFromMessage({ onAdded }: { onAdded: () => void }) {
  const [message, setMessage] = useState("");
  const addExpense = useAddExpense();


  const METHOD_LABELS = {
    pix: "PIX",
    boleto: "Boleto",
    credit: "Crédito",
  } as const;

  const handleAdd = () => {
    const parsed = parseExpenseMessage(message);
    if (!parsed) {
      toast({
        title: "Não foi possível interpretar",
        description: "Inclua valor, categoria e forma de pagamento (ex.: 'R$ 45,90 alimentação crédito').",
        variant: "destructive",
      });
      return;
    }
    
    addExpense.mutate(parsed, {
      onSuccess: (saved) => {
        toast({ title: "Despesa adicionada", description: `${saved.category} • ${METHOD_LABELS[saved.method]}` });
        setMessage("");
        onAdded();
      }
    });
  };

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Inclua sua nova despesa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Ex.: R$ 45,90 almoço restaurante alimentação crédito"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-24"
        />
        <div className="flex justify-end">
          <Button variant="hero" onClick={handleAdd} disabled={addExpense.isPending} className="transition-smooth">
            {addExpense.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
