export type PaymentMethod = "pix" | "boleto" | "credit";

export type Category = 
  | "Alimentação"
  | "Moradia" 
  | "Transporte"
  | "Saúde"
  | "Educação"
  | "Trabalho"
  | "Assinaturas"
  | "Lazer"
  | "Viagens"
  | "Vestuário"
  | "Família"
  | "Impostos"
  | "Doações & Presentes"
  | "Outros";

export interface Expense {
  id: string;
  amount: number; // in BRL
  category: Category;
  method: PaymentMethod;
  date: string; // ISO string
  source: "whatsapp" | "manual";
  note?: string;
}
