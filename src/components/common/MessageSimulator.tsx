import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export type FieldValue = string | number;

export interface MessageSimulatorProps<T extends Record<string, FieldValue>> {
  title?: string;
  placeholder?: string;
  parse: (message: string) => T | null;
  onConfirm?: (data: T) => void;
  initialValues?: Partial<T>;
}

export function MessageSimulator<T extends Record<string, FieldValue>>({
  title = "Simulador de mensagem",
  placeholder = "Cole ou digite uma mensagem...",
  parse,
  onConfirm,
  initialValues,
}: MessageSimulatorProps<T>) {
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<T | null>(null);

  const handleParse = () => {
    const result = parse(message);
    if (!result) {
      toast({
        title: "Não foi possível interpretar",
        description: "Ajuste a mensagem e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    setFields({ ...(initialValues as any), ...result });
  };

  const handleChange = (key: keyof T, value: string) => {
    if (!fields) return;
    const current = fields[key];
    const casted: any = typeof current === "number" ? Number(value.replace(",", ".")) : value;
    setFields({ ...fields, [key]: casted });
  };

  const handleConfirm = () => {
    if (!fields) return;
    onConfirm?.(fields);
    toast({ title: "Dados prontos", description: "Você pode salvar/usar os dados acima." });
  };

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-24"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setMessage("")}>Limpar</Button>
          <Button variant="hero" onClick={handleParse}>Interpretar</Button>
        </div>

        {fields && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</Label>
                  <Input
                    value={String(v ?? "")}
                    onChange={(e) => handleChange(k as keyof T, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleConfirm}>Confirmar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
