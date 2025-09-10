import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Investment } from "@/types/investment";
import { useInvestmentTransactions, useDeleteTransaction } from "@/hooks/useInvestmentTransactions";
import { currency, formatQuantity } from "@/lib/investments";
import { parseDateFromDatabase } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TransactionHistoryDialogProps {
  investment: Investment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionHistoryDialog({ investment, open, onOpenChange }: TransactionHistoryDialogProps) {
  const { data: transactions, isLoading } = useInvestmentTransactions(investment.id);
  const deleteTransaction = useDeleteTransaction();

  const handleDelete = async (transactionId: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      await deleteTransaction.mutateAsync(transactionId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Transações - {investment.nome_investimento}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Posição Atual:</strong> {formatQuantity(investment.current_quantity)} ações
            </div>
            <div>
              <strong>Preço Médio:</strong> {currency(investment.average_purchase_price, investment.moeda)}
            </div>
            <div>
              <strong>Lucro Realizado:</strong> 
              <span className={investment.realized_profit_loss >= 0 ? "text-green-600" : "text-red-600"}>
                {currency(investment.realized_profit_loss, investment.moeda)}
              </span>
            </div>
            <div>
              <strong>Status:</strong> 
              <Badge variant={investment.is_closed ? "secondary" : "default"}>
                {investment.is_closed ? "Fechado" : "Aberto"}
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div>Carregando transações...</div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Preço Unit.</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {parseDateFromDatabase(transaction.transaction_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transaction.transaction_type === "BUY" ? "default" : "destructive"}
                      >
                        {transaction.transaction_type === "BUY" ? "Compra" : "Venda"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatQuantity(transaction.quantity)}</TableCell>
                    <TableCell>
                      {currency(transaction.unit_price, investment.moeda)}
                    </TableCell>
                    <TableCell>
                      {currency(transaction.quantity * transaction.unit_price, investment.moeda)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
                        disabled={deleteTransaction.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}