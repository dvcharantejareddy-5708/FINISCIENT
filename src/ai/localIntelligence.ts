import type { Category, SharedProduct, Transaction } from "../data/dataset";

const MERCHANT_MAP: Record<string, Category> = {
  zomato: "Food",
  swiggy: "Food",
  mess: "Food",
  canteen: "Food",
  kirana: "Food",
  "cafe coffee": "Food",
  "domino": "Food",
  myntra: "Shopping",
  amazon: "Shopping",
  audiomart: "Shopping",
  headphone: "Shopping",
  bookmyshow: "Entertainment",
  pvr: "Entertainment",
  steam: "Entertainment",
  uber: "Transport",
  rapido: "Transport",
  metro: "Transport",
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  jio: "Subscriptions",
  nptel: "Education",
  stationery: "Education",
};

export type LocalAiResult = {
  entity: string;
  category: Category;
  confidence: number;
  notes: string;
};

export function classifyLocal(input: string): LocalAiResult {
  const text = input.toLowerCase();
  const hit = Object.entries(MERCHANT_MAP).find(([k]) => text.includes(k));
  if (hit) {
    return {
      entity: input,
      category: hit[1],
      confidence: 0.92,
      notes: `Local rules matched "${hit[0]}" -> ${hit[1]}. No cloud call. No amounts invented.`,
    };
  }
  return {
    entity: input,
    category: "Shopping",
    confidence: 0.54,
    notes: "No merchant rule matched. Fallback category Shopping for shared product context.",
  };
}

export function classifyProduct(product: SharedProduct): LocalAiResult {
  return classifyLocal(`${product.title} ${product.merchant}`);
}

export function classifyTx(tx: Transaction): LocalAiResult {
  return classifyLocal(tx.merchant);
}
