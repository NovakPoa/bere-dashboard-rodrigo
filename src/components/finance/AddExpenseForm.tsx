import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAddExpense } from "@/hooks/useFinance";
import { toast } from "@/hooks/use-toast";
import type { Category, PaymentMethod } from "@/types/expense";

const categories: Category[] = [
  "Alimentação",
  "Moradia",
  "Transporte", 
  "Saúde",
  "Educação",
  "Trabalho",
  "Assinaturas",
  "Lazer",
  "Viagens",
  "Vestuário",
  "Família",
  "Impostos",
  "Doações & Presentes",
  "Outros"
];

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "boleto", label: "Boleto" }
];

const formSchema = z.object({
  note: z.string().min(1, "Descrição é obrigatória"),
  category: z.enum(categories as [Category, ...Category[]], {
    required_error: "Categoria é obrigatória"
  }),
  amount: z.string().min(1, "Valor é obrigatório").refine((val) => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num > 0;
  }, "Valor deve ser um número positivo"),
  method: z.enum(["pix", "credit", "boleto"], {
    required_error: "Forma de pagamento é obrigatória"
  })
});

type FormData = z.infer<typeof formSchema>;

export default function AddExpenseForm({ onAdded }: { onAdded: () => void }) {
  const addExpense = useAddExpense();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      note: "",
      category: undefined,
      amount: "",
      method: undefined
    }
  });

  const onSubmit = (data: FormData) => {
    const amount = parseFloat(data.amount.replace(",", "."));
    
    addExpense.mutate({
      note: data.note,
      category: data.category,
      amount,
      method: data.method,
      source: "manual"
    }, {
      onSuccess: () => {
        toast({ 
          title: "Despesa adicionada", 
          description: `${data.category} • R$ ${amount.toFixed(2).replace(".", ",")}` 
        });
        form.reset();
        onAdded();
      }
    });
  };

  const formatCurrency = (value: string) => {
    // Remove caracteres não numéricos exceto vírgula e ponto
    const numbers = value.replace(/[^\d,\.]/g, "");
    // Converte vírgula para ponto para validação
    return numbers;
  };

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Nova Despesa</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: Almoço no restaurante"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: 45,90"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                variant="hero" 
                disabled={addExpense.isPending}
                className="transition-smooth"
              >
                {addExpense.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}