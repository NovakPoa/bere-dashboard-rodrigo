import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAddIncome } from "@/hooks/useIncome";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { IncomeCategory, PaymentMethod } from "@/types/income";

const categories: IncomeCategory[] = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Vendas",
  "Aluguéis",
  "Prêmios",
  "Restituições",
  "Outros"
];

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "boleto", label: "Boleto" }
];

const formSchema = z.object({
  note: z.string().min(1, "Descrição é obrigatória"),
  category: z.enum(categories as [IncomeCategory, ...IncomeCategory[]], {
    required_error: "Categoria é obrigatória"
  }),
  date: z.date({
    required_error: "Data é obrigatória"
  }).refine((date) => date <= new Date(), "Data não pode ser futura"),
  amount: z.string().min(1, "Valor é obrigatório").refine((val) => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num > 0;
  }, "Valor deve ser um número positivo"),
  method: z.enum(["pix", "credit", "boleto"], {
    required_error: "Forma de recebimento é obrigatória"
  })
});

type FormData = z.infer<typeof formSchema>;

export default function AddIncomeForm({ onAdded }: { onAdded: () => void }) {
  const addIncome = useAddIncome();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      note: "",
      category: undefined,
      date: new Date(),
      amount: "",
      method: undefined
    }
  });

  const onSubmit = (data: FormData) => {
    const amount = parseFloat(data.amount.replace(",", "."));
    
    addIncome.mutate({
      note: data.note,
      category: data.category,
      date: data.date.toISOString().split('T')[0],
      amount,
      method: data.method,
      source: "manual"
    }, {
      onSuccess: () => {
        toast({ 
          title: "Ganho adicionado", 
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
        <CardTitle className="text-sm text-muted-foreground">Novo Ganho</CardTitle>
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
                      placeholder="Ex.: Salário mensal"
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
                      placeholder="Ex.: 3500,00"
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
                  <FormLabel>Forma de Recebimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de recebimento" />
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

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                variant="hero" 
                disabled={addIncome.isPending}
                className="transition-smooth"
              >
                {addIncome.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}