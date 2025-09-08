export type PaymentMethod = "pix" | "boleto" | "credit";

export type IncomeCategory = string;

export interface Income {
  id: string;
  amount: number; // in BRL
  category: IncomeCategory;
  method: PaymentMethod;
  date: string; // ISO string
  source: "whatsapp" | "manual";
  note?: string;
  installmentsTotal?: number;
  installmentNumber?: number;
  originalIncomeId?: string;
  isInstallment?: boolean;
}