import type { Category, Transaction } from "../data/dataset";

export interface CsvParseResult {
  success: boolean;
  transactions: Transaction[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  spendingProfile: string;
  topCategory: Category;
  totalSpend: number;
  errorMessage?: string;
  detectedHeaders: string[];
}

const KEYWORD_CATEGORIES: Record<string, Category> = {
  // Food
  zomato: "Food",
  swiggy: "Food",
  canteen: "Food",
  mess: "Food",
  cafe: "Food",
  coffee: "Food",
  bistro: "Food",
  grill: "Food",
  biryani: "Food",
  mcdonald: "Food",
  kfc: "Food",
  domino: "Food",
  pizza: "Food",
  restaurant: "Food",
  bakery: "Food",
  tea: "Food",
  chai: "Food",
  dhaba: "Food",
  starbucks: "Food",
  burger: "Food",
  blinkit: "Food",
  zepto: "Food",
  instamart: "Food",

  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  "h&m": "Shopping",
  zara: "Shopping",
  decathlon: "Shopping",
  ajio: "Shopping",
  nike: "Shopping",
  meesho: "Shopping",
  audiomart: "Shopping",
  headphone: "Shopping",
  clothing: "Shopping",
  electronics: "Shopping",
  mall: "Shopping",

  // Transport
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  metro: "Transport",
  irctc: "Transport",
  fuel: "Transport",
  petrol: "Transport",
  diesel: "Transport",
  auto: "Transport",
  bus: "Transport",
  railway: "Transport",
  fastag: "Transport",

  // Subscriptions
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  prime: "Subscriptions",
  youtube: "Subscriptions",
  hotstar: "Subscriptions",
  claude: "Subscriptions",
  chatgpt: "Subscriptions",
  openai: "Subscriptions",
  icloud: "Subscriptions",
  apple: "Subscriptions",
  jio: "Subscriptions",
  airtel: "Subscriptions",
  wifi: "Subscriptions",

  // Entertainment
  pvr: "Entertainment",
  inox: "Entertainment",
  cinema: "Entertainment",
  movie: "Entertainment",
  bookmyshow: "Entertainment",
  gaming: "Entertainment",
  steam: "Entertainment",
  playstation: "Entertainment",

  // Education
  nptel: "Education",
  coursera: "Education",
  udemy: "Education",
  book: "Education",
  college: "Education",
  university: "Education",
  xerox: "Education",
  stationery: "Education",
  tuition: "Education",
  exam: "Education",
  library: "Education",
};

export function classifyMerchant(merchant: string): Category {
  const m = merchant.toLowerCase();
  for (const [kw, cat] of Object.entries(KEYWORD_CATEGORIES)) {
    if (m.includes(kw)) return cat;
  }
  return "Shopping";
}

function parseCsvRows(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

function cleanAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹$,]/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const clean = raw.trim();

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Handle MM/DD/YYYY or MM-DD-YYYY
  const mdy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (mdy) {
    const month = mdy[1].padStart(2, "0");
    const day = mdy[2].padStart(2, "0");
    const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function parseTransactionCsv(csvText: string): CsvParseResult {
  const rows = parseCsvRows(csvText);

  if (rows.length === 0) {
    return {
      success: false,
      transactions: [],
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      spendingProfile: "Empty file",
      topCategory: "Food",
      totalSpend: 0,
      errorMessage: "No transactions were found in this file.",
      detectedHeaders: [],
    };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase().trim());
  const headerRow = rows[0];

  let dateIdx = rawHeaders.findIndex((h) => h.includes("date") || h.includes("time"));
  let amountIdx = rawHeaders.findIndex(
    (h) => h.includes("amount") || h.includes("debit") || h.includes("spend") || h.includes("cost") || h.includes("rupee") || h.includes("inr")
  );
  let merchantIdx = rawHeaders.findIndex(
    (h) => h.includes("merchant") || h.includes("desc") || h.includes("narration") || h.includes("party") || h.includes("name") || h.includes("payee")
  );
  let categoryIdx = rawHeaders.findIndex((h) => h.includes("cat") || h.includes("type") || h.includes("genre"));
  let channelIdx = rawHeaders.findIndex((h) => h.includes("channel") || h.includes("mode") || h.includes("method"));

  // Fallback heuristics if column headers are missing or unusual
  if (dateIdx === -1 && rows.length > 1) {
    // Look for column containing date-like string
    for (let c = 0; c < rows[1].length; c++) {
      if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(rows[1][c])) {
        dateIdx = c;
        break;
      }
    }
  }

  if (amountIdx === -1 && rows.length > 1) {
    for (let c = 0; c < rows[1].length; c++) {
      if (c !== dateIdx && /^[₹$]?\s*[-+]?\d+(\.\d+)?$/.test(rows[1][c].replace(/,/g, "").trim())) {
        amountIdx = c;
        break;
      }
    }
  }

  if (merchantIdx === -1 && rows.length > 1) {
    for (let c = 0; c < rows[1].length; c++) {
      if (c !== dateIdx && c !== amountIdx) {
        merchantIdx = c;
        break;
      }
    }
  }

  const startRow = (dateIdx !== -1 && rawHeaders[dateIdx].includes("date")) ||
    (amountIdx !== -1 && rawHeaders[amountIdx].includes("amount")) ? 1 : 0;

  if (amountIdx === -1) {
    return {
      success: false,
      transactions: [],
      totalRows: rows.length,
      validRows: 0,
      skippedRows: rows.length,
      spendingProfile: "Invalid format",
      topCategory: "Food",
      totalSpend: 0,
      errorMessage: "We need transaction amounts to calculate spending patterns. Check the amount column.",
      detectedHeaders: headerRow,
    };
  }

  const transactions: Transaction[] = [];
  let skipped = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    const amountVal = cleanAmount(row[amountIdx]);

    if (amountVal <= 0) {
      skipped++;
      continue;
    }

    const dateVal = dateIdx !== -1 ? normalizeDate(row[dateIdx]) : "2026-09-15";
    const merchantVal = merchantIdx !== -1 && row[merchantIdx]?.trim()
      ? row[merchantIdx].trim().replace(/^"|"$/g, "")
      : "UPI Merchant";

    let categoryVal: Category;
    if (categoryIdx !== -1 && row[categoryIdx]) {
      const explicitCat = row[categoryIdx].trim();
      const match = (["Food", "Shopping", "Entertainment", "Transport", "Subscriptions", "Education"] as Category[]).find(
        (c) => c.toLowerCase() === explicitCat.toLowerCase()
      );
      categoryVal = match ?? classifyMerchant(merchantVal);
    } else {
      categoryVal = classifyMerchant(merchantVal);
    }

    const channelVal = channelIdx !== -1 && row[channelIdx]?.toLowerCase().includes("card") ? "Card" : "UPI";

    transactions.push({
      id: `csv-${r}-${Date.now().toString(36)}`,
      merchant: merchantVal,
      amount: Math.round(amountVal),
      category: categoryVal,
      date: dateVal,
      channel: channelVal,
    });
  }

  if (transactions.length === 0) {
    return {
      success: false,
      transactions: [],
      totalRows: rows.length - startRow,
      validRows: 0,
      skippedRows: rows.length - startRow,
      spendingProfile: "No valid rows",
      topCategory: "Food",
      totalSpend: 0,
      errorMessage: "Some transaction rows could not be read. Check the amount and date columns and try again.",
      detectedHeaders: headerRow,
    };
  }

  // Calculate totals and profile
  const categoryTotals: Record<Category, number> = {
    Food: 0,
    Shopping: 0,
    Entertainment: 0,
    Transport: 0,
    Subscriptions: 0,
    Education: 0,
  };

  let totalSpend = 0;
  for (const t of transactions) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    totalSpend += t.amount;
  }

  let topCategory: Category = "Food";
  let maxSpend = 0;
  for (const [cat, sum] of Object.entries(categoryTotals)) {
    if (sum > maxSpend) {
      maxSpend = sum;
      topCategory = cat as Category;
    }
  }

  let spendingProfile = "Balanced Student Profile";
  if (topCategory === "Food" && maxSpend / totalSpend > 0.35) {
    spendingProfile = "Food & Dining Dominant";
  } else if (topCategory === "Shopping" && maxSpend / totalSpend > 0.35) {
    spendingProfile = "Shopping & Commerce Heavy";
  } else if (topCategory === "Transport" && maxSpend / totalSpend > 0.25) {
    spendingProfile = "High Commute Spender";
  } else if (topCategory === "Subscriptions" && maxSpend / totalSpend > 0.15) {
    spendingProfile = "High Recurring Subscriptions";
  }

  return {
    success: true,
    transactions,
    totalRows: rows.length - startRow,
    validRows: transactions.length,
    skippedRows: skipped,
    spendingProfile,
    topCategory,
    totalSpend,
    detectedHeaders: headerRow,
  };
}
