import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addExpense, parseExpenseMessage } from "@/lib/finance";
import { toast } from "@/hooks/use-toast";

export default function AddExpenseFromMessage({ onAdded }: { onAdded: () => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = () => {
    setLoading(true);
    try {
      const parsed = parseExpenseMessage(message);
      if (!parsed) {
        toast({
          title: "Could not parse",
          description: "Please include value, category and payment method (e.g. 'R$ 45,90 restaurante credit').",
          variant: "destructive",
        });
        return;
      }
      const saved = addExpense(parsed);
      toast({ title: "Expense added", description: `${saved.category} • ${saved.method}` });
      setMessage("");
      onAdded();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Paste WhatsApp Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Ex: R$ 45,90 restaurante credit"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-24"
        />
        <div className="flex justify-end">
          <Button variant="hero" onClick={handleAdd} disabled={loading} className="transition-smooth">
            {loading ? "Adding..." : "Parse & Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
