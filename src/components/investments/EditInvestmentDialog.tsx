import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEditInvestment } from "@/hooks/useInvestments";
import { Investment, Currency } from "@/types/investment";
import { CURRENCY_LABELS } from "@/lib/investments";

const formSchema = z.object({
  nome_investimento: z.string().min(1, "Nome é obrigatório"),
  tipo_investimento: z.string().min(1, "Tipo é obrigatório"),
  corretora: z.string().min(1, "Corretora é obrigatória"),
  moeda: z.enum(["BRL", "USD"] as const),
  preco_unitario_compra: z.number().min(0, "Preço de compra não pode ser negativo"),
  quantidade: z.number().min(0.000001, "Quantidade deve ser maior que zero"),
  data_investimento: z.date({ required_error: "Data é obrigatória" }),
});

type FormData = z.infer<typeof formSchema>;

interface EditInvestmentDialogProps {
  investment: Investment;
  onUpdated?: () => void;
  children: React.ReactNode;
}

export function EditInvestmentDialog({ investment, onUpdated, children }: EditInvestmentDialogProps) {
  const [open, setOpen] = useState(false);
  const editInvestment = useEditInvestment();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_investimento: investment.nome_investimento,
      tipo_investimento: investment.tipo_investimento,
      corretora: investment.corretora,
      moeda: investment.moeda,
      preco_unitario_compra: investment.preco_unitario_compra,
      quantidade: investment.quantidade,
      data_investimento: new Date(investment.data_investimento),
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.reset({
        nome_investimento: investment.nome_investimento,
        tipo_investimento: investment.tipo_investimento,
        corretora: investment.corretora,
        moeda: investment.moeda,
        preco_unitario_compra: investment.preco_unitario_compra,
        quantidade: investment.quantidade,
        data_investimento: new Date(investment.data_investimento),
      });
    }
  };

  const onSubmit = (data: FormData) => {
    const formattedData = {
      id: investment.id,
      nome_investimento: data.nome_investimento,
      tipo_investimento: data.tipo_investimento,
      corretora: data.corretora,
      moeda: data.moeda,
      preco_unitario_compra: data.preco_unitario_compra,
      preco_unitario_atual: investment.preco_unitario_atual,
      quantidade: data.quantidade,
      data_investimento: format(data.data_investimento, "yyyy-MM-dd"),
    };

    editInvestment.mutate(formattedData, {
      onSuccess: () => {
        setOpen(false);
        onUpdated?.();
      },
    });
  };

  const formatCurrency = (value: string, currencyType: Currency) => {
    const floatValue = parseFloat(value);
    const locale = currencyType === "USD" ? "en-US" : "pt-BR";
    return floatValue.toLocaleString(locale, {
      style: "currency",
      currency: currencyType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Investimento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_investimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Investimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PETR4, HGLG11..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_investimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ações, Fundos Imobiliários, CDB..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="corretora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corretora</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: XP Investimentos, Nubank, Inter..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moeda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moeda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a moeda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BRL">{CURRENCY_LABELS.BRL}</SelectItem>
                        <SelectItem value="USD">{CURRENCY_LABELS.USD}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_unitario_compra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Compra</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={form.watch("moeda") === "USD" ? "US$ 0.00" : "R$ 0,00"}
                        value={field.value >= 0 ? formatCurrency(field.value.toString(), form.watch("moeda")) : ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          const floatValue = parseFloat(value) / 100;
                          field.onChange(floatValue || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-1">
                <FormItem>
                  <FormLabel>Valor Total Investido</FormLabel>
                  <FormControl>
                    <Input
                      value={(() => {
                        const preco = form.watch("preco_unitario_compra") || 0;
                        const quantidade = form.watch("quantidade") || 0;
                        const total = preco * quantidade;
                        const moeda = form.watch("moeda");
                        if (total > 0) {
                          return formatCurrency(total.toString(), moeda);
                        }
                        return moeda === "USD" ? "US$ 0.00" : "R$ 0,00";
                      })()}
                      placeholder="Preço de Compra × Quantidade"
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="data_investimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Investimento</FormLabel>
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
                              format(field.value, "PPP", { locale: ptBR })
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
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={ptBR}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={editInvestment.isPending}
              >
                {editInvestment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}