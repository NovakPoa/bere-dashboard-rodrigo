import { useMemo, useState, useEffect } from "react";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useRemoveExpense } from "@/hooks/useFinance";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit } from "lucide-react";
import { parseDateOnly } from "@/lib/finance";
import { UpdateExpenseDialog } from "./UpdateExpenseDialog";


const METHOD_LABELS: Record<Expense["method"], string> = {
  pix: "PIX",
  boleto: "Boleto",
  credit: "Crédito",
};

const ITEMS_PER_PAGE = 10;

export default function ExpensesTable({ expenses, onChange }: { expenses: Expense[]; onChange: () => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const removeExpense = useRemoveExpense();

  // Reset to page 1 when expenses change
  useEffect(() => {
    setCurrentPage(1);
  }, [expenses.length]);

  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExpenses = expenses.slice(startIndex, endIndex);

  const handleDelete = (id: string) => {
    removeExpense.mutate(id, {
      onSuccess: () => {
        toast({ title: "Excluído" });
        onChange();
      }
    });
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base md:text-lg font-medium">Todas as Despesas</CardTitle>
        {expenses.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(endIndex, expenses.length)} de {expenses.length} despesas
          </p>
        )}
      </CardHeader>
      <CardContent className="p-3 md:p-6 space-y-4">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[70px] text-xs md:text-sm">Data</TableHead>
                <TableHead className="min-w-[80px] text-xs md:text-sm">Descrição</TableHead>
                <TableHead className="min-w-[60px] text-xs md:text-sm">Categoria</TableHead>
                <TableHead className="min-w-[70px] text-xs md:text-sm">Forma de pagamento</TableHead>
                <TableHead className="min-w-[50px] text-xs md:text-sm">Parcela</TableHead>
                <TableHead className="text-right min-w-[60px] text-xs md:text-sm">Valor</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">{parseDateOnly(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs md:text-sm truncate max-w-[120px]" title={e.note || ''}>
                    {e.note || '-'}
                  </TableCell>
                  <TableCell className="capitalize text-xs md:text-sm">{e.category}</TableCell>
                  <TableCell className="capitalize text-xs md:text-sm">{METHOD_LABELS[e.method]}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    {e.isInstallment && e.installmentNumber && e.installmentsTotal 
                      ? `${e.installmentNumber}/${e.installmentsTotal}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right font-medium text-xs md:text-sm">{e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <UpdateExpenseDialog expense={e} onUpdated={onChange}>
                        <Button variant="ghost" size="sm" aria-label="Editar" className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </UpdateExpenseDialog>
                      <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => handleDelete(e.id)} className="h-8 w-8 p-0">
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Ainda não há despesas. Cole uma mensagem do WhatsApp para adicionar a primeira.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {generatePageNumbers().map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => goToPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => goToPage(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
