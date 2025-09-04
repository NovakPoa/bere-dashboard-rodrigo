export type PaymentMethod = "pix" | "boleto" | "credit";

export type IncomeCategory = 
  | "Salário"
  | "Freelance"
  | "Investimentos"
  | "Vendas"
  | "Aluguéis"
  | "Prêmios"
  | "Restituições"
  | "Outros";

export interface Income {
  id: string;
  amount: number; // in BRL
  category: IncomeCategory;
  method: PaymentMethod;
  date: string; // ISO string
  source: "whatsapp" | "manual";
  note?: string;
}