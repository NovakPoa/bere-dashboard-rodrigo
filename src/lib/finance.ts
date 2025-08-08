import { Expense, Category, PaymentMethod } from "@/types/expense";

const STORAGE_KEY = "finance_expenses_v1";

const CATEGORY_SYNONYMS: Record<string, Category> = {
  // Novas categorias
  alimentacao: "alimentacao",
  "alimentação": "alimentacao",
  comida: "alimentacao",
  refeicao: "alimentacao",
  "refeição": "alimentacao",
  restaurante: "alimentacao",

  assinaturas: "assinaturas",
  assinatura: "assinaturas",
  streaming: "assinaturas",
  netflix: "assinaturas",
  spotify: "assinaturas",

  casa: "casa",
  aluguel: "casa",
  renting: "casa",
  condominio: "casa",
  "condomínio": "casa",

  lazer: "lazer",
  cinema: "lazer",
  bar: "lazer",
  show: "lazer",

  mercado: "mercado",
  supermercado: "mercado",
  supermarket: "mercado",
  compras: "mercado",

  presentes: "presentes",
  presente: "presentes",
  gift: "presentes",

  saude: "saude",
  "saúde": "saude",
  farmacia: "saude",
  "farmácia": "saude",
  medico: "saude",
  "médico": "saude",

  transporte: "transporte",
  gas: "transporte",
  gasolina: "transporte",
  combustivel: "transporte",
  "combustível": "transporte",
  uber: "transporte",
  taxi: "transporte",

  utilidades: "utilidades",
  conta: "utilidades",
  luz: "utilidades",
  energia: "utilidades",
  agua: "utilidades",
  "água": "utilidades",
  internet: "utilidades",
  telefone: "utilidades",

  outros: "outros",
  outro: "outros",
};

const METHOD_SYNONYMS: Record<string, PaymentMethod> = {
  pix: "pix",
  boleto: "boleto",
  credit: "credit",
  crédito: "credit",
  credito: "credit",
  cartao: "credit",
  cartão: "credit",
};

export function parseExpenseMessage(message: string): Omit<Expense, "id" | "date"> | null {
  if (!message) return null;
  const lower = message.toLowerCase();

  // amount: accept formats like "r$ 45,90" or "45.90"
  const currencyMatch = lower.match(/(?:r\$\s*)?(-?[0-9]+[\.,]?[0-9]{0,2})/i);
  const rawAmount = currencyMatch?.[1]?.replace(".", "").replace(",", ".");
  const amount = rawAmount ? parseFloat(rawAmount) : NaN;

  // category
  let category: Category | undefined;
  for (const key of Object.keys(CATEGORY_SYNONYMS)) {
    if (lower.includes(key)) {
      category = CATEGORY_SYNONYMS[key];
      break;
    }
  }

  // method
  let method: PaymentMethod | undefined;
  for (const key of Object.keys(METHOD_SYNONYMS)) {
    if (lower.includes(key)) {
      method = METHOD_SYNONYMS[key];
      break;
    }
  }

  if (!isFinite(amount) || amount <= 0 || !category || !method) {
    return null;
  }

  return {
    amount,
    category,
    method,
    source: "whatsapp",
    note: message.trim(),
  };
}

export function getExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];

    const mapOldToNew: Record<string, Category> = {
      restaurante: "alimentacao",
      restaurant: "alimentacao",
      refeicao: "alimentacao",
      "refeição": "alimentacao",
      comida: "alimentacao",
      supermarket: "mercado",
      mercado: "mercado",
      supermercado: "mercado",
      compras: "mercado",
      gas: "transporte",
      gasolina: "transporte",
      combustivel: "transporte",
      "combustível": "transporte",
      renting: "casa",
      aluguel: "casa",
      rent: "casa",
      presents: "presentes",
      presentes: "presentes",
      gift: "presentes",
      // já novas
      alimentacao: "alimentacao",
      "alimentação": "alimentacao",
      assinaturas: "assinaturas",
      assinatura: "assinaturas",
      casa: "casa",
      lazer: "lazer",
      saude: "saude",
      "saúde": "saude",
      transporte: "transporte",
      utilidades: "utilidades",
      outros: "outros",
    };

    const validNew = new Set<Category>([
      "alimentacao",
      "assinaturas",
      "casa",
      "lazer",
      "mercado",
      "presentes",
      "saude",
      "transporte",
      "utilidades",
      "outros",
    ]);

    const normalized: Expense[] = (Array.isArray(parsed) ? parsed : []).map((e: any) => {
      const key = typeof e?.category === "string" ? e.category.toLowerCase() : "";
      const newCat = mapOldToNew[key] ?? (validNew.has(e?.category) ? e.category : "outros");
      return { ...e, category: newCat } as Expense;
    });

    return normalized;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Omit<Expense, "id" | "date">) {
  const all = getExpenses();
  const withId: Expense = {
    ...expense,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  all.unshift(withId);
  saveExpenses(all);
  return withId;
}

export function removeExpense(id: string) {
  const filtered = getExpenses().filter((e) => e.id !== id);
  saveExpenses(filtered);
  return filtered;
}

export function filterExpenses(
  expenses: Expense[],
  opts: { category?: Category | "all"; method?: PaymentMethod | "all" }
) {
  return expenses.filter((e) => {
    const okCat = opts.category && opts.category !== "all" ? e.category === opts.category : true;
    const okMet = opts.method && opts.method !== "all" ? e.method === opts.method : true;
    return okCat && okMet;
  });
}

export function getMonthlyTotal(expenses: Expense[], date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function groupByCategory(expenses: Expense[]): Record<Category, number> {
  const base: Record<Category, number> = {
    alimentacao: 0,
    assinaturas: 0,
    casa: 0,
    lazer: 0,
    mercado: 0,
    presentes: 0,
    saude: 0,
    transporte: 0,
    utilidades: 0,
    outros: 0,
  };
  for (const e of expenses) base[e.category] += e.amount;
  return base;
}

export function groupByMethod(expenses: Expense[]): Record<PaymentMethod, number> {
  const base: Record<PaymentMethod, number> = { pix: 0, boleto: 0, credit: 0 };
  for (const e of expenses) base[e.method] += e.amount;
  return base;
}
