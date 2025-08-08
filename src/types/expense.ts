export type PaymentMethod = "pix" | "boleto" | "credit";

export type Category =
  | "alimentacao"
  | "assinaturas"
  | "casa"
  | "lazer"
  | "mercado"
  | "presentes"
  | "saude"
  | "transporte"
  | "utilidades"
  | "outros";

export interface Expense {
  id: string;
  amount: number; // in BRL
  category: Category;
  method: PaymentMethod;
  date: string; // ISO string
  source: "whatsapp" | "manual";
  note?: string;
}
