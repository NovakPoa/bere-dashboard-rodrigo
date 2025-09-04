import { Currency } from "@/types/investment";

interface ExchangeRateResponse {
  USDBRL: {
    bid: string;
    ask: string;
    timestamp: string;
  };
}

let cachedRate: number | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em ms
const FALLBACK_RATE = 5.0; // Taxa de fallback

export const fetchUSDToBRLRate = async (): Promise<number> => {
  // Verificar cache
  if (cachedRate && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    
    if (!response.ok) {
      throw new Error("Falha ao buscar cotação");
    }

    const data: ExchangeRateResponse = await response.json();
    const rate = parseFloat(data.USDBRL.bid);
    
    if (isNaN(rate) || rate <= 0) {
      throw new Error("Taxa inválida recebida");
    }

    // Atualizar cache
    cachedRate = rate;
    cacheTimestamp = Date.now();
    
    return rate;
  } catch (error) {
    console.warn("Erro ao buscar cotação USD/BRL, usando taxa de fallback:", error);
    return FALLBACK_RATE;
  }
};

export const convertToReais = (valor: number, moeda: Currency, cotacaoDolar: number): number => {
  return moeda === "USD" ? valor * cotacaoDolar : valor;
};

export const formatExchangeRate = (rate: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);
};