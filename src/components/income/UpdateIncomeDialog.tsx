import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { useUpdateIncome } from "@/hooks/useIncome";
import { useIncomeCategories, INCOME_SUGGESTIONS } from "@/hooks/useCategories";
import type { Income, IncomeCategory, PaymentMethod } from "@/types/income";


const PAYMENT_METHODS: PaymentMethod[] = ["pix", "boleto", "credit"];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Cartão de Crédito"
};

const formSchema = z.object({
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  category: z.string().min(1, "Categoria é obrigatória").max(50, "Categoria muito longa"),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  date: z.string().min(1, "Data é obrigatória"),
  note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UpdateIncomeDialogProps {
  income: Income;
  children?: React.ReactNode;
}

export default function UpdateIncomeDialog({ income, children }: UpdateIncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const updateIncome = useUpdateIncome();
  const { data: userCategories = [] } = useIncomeCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: income.amount,
      category: income.category,
      method: income.method,
      date: income.date,
      note: income.note || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateIncome.mutateAsync({
        id: income.id,
        amount: data.amount,
        category: data.category,
        method: data.method,
        date: data.date,
        note: data.note,
        source: income.source,
        installmentsTotal: income.installmentsTotal,
        installmentNumber: income.installmentNumber,
        originalIncomeId: income.originalIncomeId,
        isInstallment: income.isInstallment,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error updating income:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form with current income values when opening
      form.reset({
        amount: income.amount,
        category: income.category,
        method: income.method,
        date: income.date,
        note: income.note || "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Ganho</DialogTitle>
          <DialogDescription>
            Atualize as informações do ganho.
            {income.isInstallment && (
              <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                Este ganho faz parte de um parcelamento ({income.installmentNumber}/{income.installmentsTotal}).
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  <FormControl>
                    <CategoryCombobox
                      value={field.value}
                      onChange={field.onChange}
                      suggestions={[...INCOME_SUGGESTIONS, ...userCategories]}
                      placeholder="Selecione ou digite uma categoria..."
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
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {METHOD_LABELS[method]}
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
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={format(new Date(), "yyyy-MM-dd")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione uma descrição..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateIncome.isPending}>
                {updateIncome.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}