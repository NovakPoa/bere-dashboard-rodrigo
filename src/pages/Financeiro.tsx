import { Wallet, TrendingUp, PieChart, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useExpenses } from "@/hooks/useFinance";
import { useIncomes } from "@/hooks/useIncome";
import { useInvestments } from "@/hooks/useInvestments";
import { getMonthlyTotal } from "@/lib/finance";
import { currency, getPortfolioTotals } from "@/lib/investments";
import { getMonthlyIncomeTotal } from "@/lib/income";
import FinancialPeriodChart from "@/components/finance/FinancialPeriodChart";

export default function Financeiro() {
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();
  const { data: investments = [], isLoading: investmentsLoading } = useInvestments();

  const isLoading = expensesLoading || incomesLoading || investmentsLoading;

  const currentDate = new Date();
  const monthlyExpenses = getMonthlyTotal(expenses, currentDate);
  const monthlyIncomes = getMonthlyIncomeTotal(incomes, currentDate);
  const portfolioTotals = getPortfolioTotals(investments);

  const netMonthly = monthlyIncomes - monthlyExpenses;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="py-4 md:py-6">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral das suas finanças pessoais
        </p>
      </header>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-smooth hover:shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ganhos (mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{currency(monthlyIncomes)}</div>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Despesas (mês)</CardTitle>
            <Wallet className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{currency(monthlyExpenses)}</div>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo (mês)</CardTitle>
            <TrendingUp className={`h-4 w-4 ${netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currency(netMonthly)}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Patrimônio</CardTitle>
            <PieChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">
              {currency(portfolioTotals.valorAtual)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Chart */}
      <FinancialPeriodChart expenses={expenses} incomes={incomes} />
    </div>
  );
}