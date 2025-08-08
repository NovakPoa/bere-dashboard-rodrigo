export type PaymentMethod = "pix" | "boleto" | "credit";

export type Category =
  | "restaurante"
  | "supermarket"
  | "gas"
  | "renting"
  | "presents";

export interface Expense {
  id: string;
  amount: number; // in BRL
  category: Category;
  method: PaymentMethod;
  date: string; // ISO string
  source: "whatsapp" | "manual";
  note?: string;
}
