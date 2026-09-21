export type Category =
  | "Food"
  | "Shopping"
  | "Entertainment"
  | "Transport"
  | "Subscriptions"
  | "Education";

export type TrustKind = "OBSERVED" | "CALCULATED" | "PREDICTED" | "GOAL IMPACT";

export type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  category: Category;
  date: string;
  channel: "UPI" | "Card" | "NetBanking";
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthlySavingsRate: number;
};

export type SharedProduct = {
  title: string;
  merchant: string;
  price: number;
  category: Category;
  url: string;
  imageLabel: string;
};

export type Leak = {
  id: string;
  title: string;
  merchant: string;
  monthlyAmount: number;
  usageHours: number | null;
  pattern: string;
  category: Category;
};

export const CATEGORIES: Category[] = [
  "Food",
  "Shopping",
  "Entertainment",
  "Transport",
  "Subscriptions",
  "Education",
];

export const AS_OF = new Date("2026-09-20T18:00:00+05:30");

export const USER = {
  name: "Charan",
  campus: "Hyderabad",
  year: "3rd year",
  currency: "INR" as const,
};

export const GOAL: Goal = {
  id: "laptop",
  name: "New Laptop",
  target: 80000,
  saved: 35000,
  monthlySavingsRate: 6500,
};

export const DEMO_PRODUCT: SharedProduct = {
  title: "Wireless Headphones",
  merchant: "AudioMart",
  price: 3999,
  category: "Shopping",
  url: "https://shop.example/headphones",
  imageLabel: "WH",
};

export const WHAT_IF_PRESET = 2499;

export const LEAKS: Leak[] = [
  {
    id: "netflix",
    title: "Streaming plan",
    merchant: "Netflix",
    monthlyAmount: 649,
    usageHours: 14.5,
    pattern: "Recurring subscription",
    category: "Subscriptions",
  },
  {
    id: "spotify",
    title: "Music plan",
    merchant: "Spotify",
    monthlyAmount: 119,
    usageHours: 22,
    pattern: "Recurring subscription",
    category: "Subscriptions",
  },
  {
    id: "chai",
    title: "Frequent small food spends",
    merchant: "Campus cafe cluster",
    monthlyAmount: 1480,
    usageHours: null,
    pattern: "12 small food payments this month",
    category: "Food",
  },
  {
    id: "impulse",
    title: "Impulse shopping",
    merchant: "Myntra / Amazon",
    monthlyAmount: 890,
    usageHours: null,
    pattern: "Sub-₹500 cart adds, 4 times",
    category: "Shopping",
  },
];

function tx(
  id: string,
  merchant: string,
  amount: number,
  category: Category,
  date: string,
  channel: Transaction["channel"] = "UPI"
): Transaction {
  return { id, merchant, amount, category, date, channel };
}

/**
 * Current-month ledger (Sep 1 to 20, 2026).
 * Food = 7420 including observed ₹1,850.
 * Month-to-date total = 18420.
 */
export const TRANSACTIONS: Transaction[] = [
  tx("s01", "Zomato - family biryani", 1850, "Food", "2026-09-20"),
  tx("s02", "Swiggy Instamart", 430, "Food", "2026-09-19"),
  tx("s03", "Hostel mess extra", 620, "Food", "2026-09-18"),
  tx("s04", "Cafe Coffee Day", 380, "Food", "2026-09-17"),
  tx("s05", "Domino's", 720, "Food", "2026-09-16"),
  tx("s06", "Swiggy", 560, "Food", "2026-09-15"),
  tx("s07", "Campus canteen", 640, "Food", "2026-09-13"),
  tx("s08", "Zomato", 490, "Food", "2026-09-12"),
  tx("s09", "Swiggy", 580, "Food", "2026-09-09"),
  tx("s10", "Night canteen", 700, "Food", "2026-09-07"),
  tx("s11", "Zomato", 450, "Food", "2026-09-05"),
  tx("s14", "Myntra", 1299, "Shopping", "2026-09-18"),
  tx("s15", "Amazon", 890, "Shopping", "2026-09-10"),
  tx("s16", "Campus store", 491, "Shopping", "2026-09-04"),
  tx("s17", "Amazon", 1220, "Shopping", "2026-09-08"),
  tx("s18", "BookMyShow", 890, "Entertainment", "2026-09-14"),
  tx("s19", "Steam", 650, "Entertainment", "2026-09-06"),
  tx("s20", "PVR Cinemas", 780, "Entertainment", "2026-09-19"),
  tx("s21", "Rapido", 420, "Transport", "2026-09-19"),
  tx("s22", "Uber", 680, "Transport", "2026-09-14"),
  tx("s23", "Metro and bus pass", 820, "Transport", "2026-09-08"),
  tx("s24", "Netflix", 649, "Subscriptions", "2026-09-02"),
  tx("s25", "Spotify", 119, "Subscriptions", "2026-09-02"),
  tx("s26", "Jio fiber share", 299, "Subscriptions", "2026-09-01"),
  tx("s27", "NPTEL exam fee", 1200, "Education", "2026-09-11"),
  tx("s28", "Stationery", 593, "Education", "2026-09-01"),
];

/** Prior-month Food amounts used for transaction-level median + IQR. */
export const FOOD_TXN_HISTORY: number[] = [
  390, 450, 500, 550, 580, 610, 620, 620, 630, 640, 680, 700, 720,
];

/**
 * Complete months for category rolling medians.
 * Food median = 5900. Shopping median = 1800.
 */
export const BASELINE_MONTHS: { month: string; byCategory: Record<Category, number> }[] = [
  { month: "2026-03", byCategory: { Food: 5600, Shopping: 1600, Entertainment: 3800, Transport: 5200, Subscriptions: 1067, Education: 4233 } },
  { month: "2026-04", byCategory: { Food: 5900, Shopping: 1800, Entertainment: 4100, Transport: 4900, Subscriptions: 1067, Education: 3733 } },
  { month: "2026-05", byCategory: { Food: 6100, Shopping: 2100, Entertainment: 3500, Transport: 5400, Subscriptions: 1067, Education: 3333 } },
  { month: "2026-06", byCategory: { Food: 5800, Shopping: 1700, Entertainment: 4400, Transport: 5000, Subscriptions: 1067, Education: 3533 } },
  { month: "2026-07", byCategory: { Food: 5900, Shopping: 1800, Entertainment: 3900, Transport: 4800, Subscriptions: 1067, Education: 4033 } },
  { month: "2026-08", byCategory: { Food: 5700, Shopping: 1950, Entertainment: 3700, Transport: 5300, Subscriptions: 1067, Education: 3783 } },
];

export const DATA_SOURCE_NOTE =
  "CSV and prepared transaction records are the verified transaction source.";

export function toCsv(rows: Transaction[]): string {
  const header = "id,date,merchant,category,amount,channel";
  const body = rows
    .map((r) => `${r.id},${r.date},${r.merchant},${r.category},${r.amount},${r.channel}`)
    .join("\n");
  return `${header}\n${body}\n`;
}

// Sample CSV A: High Food spending (32 transactions, food dominant)
export const SAMPLE_CSV_A_FOOD = `id,date,merchant,category,amount,channel
f01,2026-09-20,Zomato - family biryani banquet,Food,2450,UPI
f02,2026-09-19,Swiggy Gourmet,Food,1280,UPI
f03,2026-09-18,Starbucks Coffee,Food,680,UPI
f04,2026-09-17,Bawarchi Restaurant,Food,950,UPI
f05,2026-09-16,Domino's Pizza Treat,Food,1420,UPI
f06,2026-09-15,Swiggy Lunch,Food,640,UPI
f07,2026-09-14,Campus Night Canteen,Food,580,UPI
f08,2026-09-13,Cafe Coffee Day,Food,450,UPI
f09,2026-09-12,Zomato Dinner,Food,820,UPI
f10,2026-09-11,KFC Chicken Bucket,Food,1150,UPI
f11,2026-09-10,Blinkit Midnight Snacks,Food,720,UPI
f12,2026-09-09,Swiggy Instamart,Food,540,UPI
f13,2026-09-08,Hostel Special Dinner,Food,600,UPI
f14,2026-09-07,McDonald's Meals,Food,890,UPI
f15,2026-09-06,Chai Point Cafe,Food,320,UPI
f16,2026-09-05,Zomato Breakfast,Food,410,UPI
f17,2026-09-18,Myntra Basic Tee,Shopping,799,UPI
f18,2026-09-10,Amazon Daily Needs,Shopping,590,UPI
f19,2026-09-14,BookMyShow Tickets,Entertainment,550,UPI
f20,2026-09-19,Rapido Bike,Transport,140,UPI
f21,2026-09-15,Uber Auto,Transport,280,UPI
f22,2026-09-08,Metro Card Recharge,Transport,400,UPI
f23,2026-09-02,Spotify Student,Subscriptions,119,UPI
f24,2026-09-01,Jio Fiber,Subscriptions,299,UPI
f25,2026-09-11,Stationery & Print,Education,320,UPI
`;

// Sample CSV B: High Shopping spending (28 transactions, high shopping baseline)
export const SAMPLE_CSV_B_SHOPPING = `id,date,merchant,category,amount,channel
b01,2026-09-20,Zara Autumn Jacket,Shopping,4990,Card
b02,2026-09-19,H&M Denim & Hoodies,Shopping,3499,Card
b03,2026-09-17,Amazon Electronics Hub,Shopping,4200,Card
b04,2026-09-15,Myntra Sneakers Sale,Shopping,2850,UPI
b05,2026-09-12,Ajio Luxe Wear,Shopping,2190,UPI
b06,2026-09-10,Decathlon Sports Gear,Shopping,1890,Card
b07,2026-09-08,Apple Accessories,Shopping,2500,Card
b08,2026-09-04,Amazon Prime Delivery,Shopping,1450,UPI
b09,2026-09-19,Swiggy Quick Meal,Food,320,UPI
b10,2026-09-18,Campus Mess,Food,400,UPI
b11,2026-09-16,Zomato Lunch,Food,380,UPI
b12,2026-09-14,Tea stall,Food,120,UPI
b13,2026-09-11,Hostel Canteen,Food,310,UPI
b14,2026-09-07,Swiggy Roll,Food,260,UPI
b15,2026-09-14,PVR Movies IMAX,Entertainment,950,UPI
b16,2026-09-06,Steam Game pass,Entertainment,499,UPI
b17,2026-09-18,Uber Ride,Transport,420,UPI
b18,2026-09-12,Rapido,Transport,150,UPI
b19,2026-09-08,Metro smart pass,Transport,600,UPI
b20,2026-09-02,Netflix Standard,Subscriptions,499,UPI
b21,2026-09-02,YouTube Premium,Subscriptions,129,UPI
b22,2026-09-05,College Textbooks,Education,1400,UPI
`;

// Sample CSV C: Balanced student budget
export const SAMPLE_CSV_C_BALANCED = `id,date,merchant,category,amount,channel
c01,2026-09-19,Campus Mess Monthly,Food,3500,UPI
c02,2026-09-17,Swiggy Weekend,Food,420,UPI
c03,2026-09-15,Hostel Canteen,Food,310,UPI
c04,2026-09-12,Cafe Treat,Food,280,UPI
c05,2026-09-08,Zomato Meal,Food,350,UPI
c06,2026-09-04,College Canteen,Food,220,UPI
c07,2026-09-16,Campus Store Notebooks,Shopping,450,UPI
c08,2026-09-09,Amazon Lab Coat,Shopping,680,UPI
c09,2026-09-18,BookMyShow Student,Entertainment,380,UPI
c10,2026-09-19,Metro Pass 30d,Transport,850,UPI
c11,2026-09-14,Rapido Ride,Transport,120,UPI
c12,2026-09-02,Spotify Student,Subscriptions,59,UPI
c13,2026-09-01,Shared WiFi,Subscriptions,250,UPI
c14,2026-09-11,NPTEL Course,Education,1000,UPI
c15,2026-09-05,Xerox Lab manuals,Education,210,UPI
`;
