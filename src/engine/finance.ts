import {
  AS_OF,
  BASELINE_MONTHS,
  CATEGORIES,
  FOOD_TXN_HISTORY,
  LEAKS,
  TRANSACTIONS,
  type Category,
  type Goal,
  type SharedProduct,
  type Transaction,
  type TrustKind,
} from "../data/dataset";
import { formatDays, formatINR, iqrStats, median, roundRupee, sum } from "./stats";

export type TrustValue = {
  value: number;
  kind: TrustKind;
  label: string;
  why: string;
};

export type CategoryPulse = {
  category: Category;
  current: TrustValue;
  typical: TrustValue;
  delta: number;
  deltaPct: number;
};

export type Anomaly = {
  tx: Transaction;
  median: number;
  q1: number;
  q3: number;
  ratio: number;
  fenceHigh: number;
  why: string;
};

export type Snapshot = {
  asOf: Date;
  dayOfMonth: number;
  daysInMonth: number;
  remainingDays: number;
  mtd: TrustValue;
  typicalMonth: TrustValue;
  typicalMtd: TrustValue;
  vsBaselinePct: number;
  forecast: TrustValue;
  forecastDelta: number;
  categories: CategoryPulse[];
  anomalies: Anomaly[];
  transactions: Transaction[];
  leaks: {
    leak: (typeof LEAKS)[number];
    perHour: number | null;
    why: string;
  }[];
};

export type GoalView = {
  goal: Goal;
  remaining: TrustValue;
  progressPct: number;
  monthsWithoutPurchase: TrustValue;
  dailySavings: number;
};

export type PurchaseImpact = {
  product: SharedProduct;
  goalName: string;
  goalTarget: number;
  goalSaved: number;
  amount: TrustValue;
  categoryBaseline: TrustValue;
  relativeSpend: TrustValue;
  remainingAfter: TrustValue;
  monthsWithPurchase: TrustValue;
  monthsWithout: TrustValue;
  delayDays: TrustValue;
  delayMonths: number;
  monthEndWithPurchase: TrustValue;
};

export type FutureSim = {
  cuts: Record<string, number>;
  monthlyImprovement: TrustValue;
  currentMonths: TrustValue;
  simulatedMonths: TrustValue;
  currentRate: number;
  simulatedRate: number;
};

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function inCurrentMonth(tx: Transaction, asOf: Date) {
  return tx.date.startsWith(
    `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}`
  );
}

export function buildSnapshot(
  asOf: Date = AS_OF,
  transactions: Transaction[] = TRANSACTIONS
): Snapshot {
  const dim = daysInMonth(asOf);
  const day = Math.min(asOf.getDate(), dim);

  // If transactions match current month, use them; otherwise use all transactions
  const monthPrefix = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}`;
  let current = transactions.filter((t) => t.date.startsWith(monthPrefix));
  if (current.length === 0) {
    current = [...transactions];
  }

  const mtdSum = sum(current.map((t) => t.amount));
  const isDemoDataset = transactions === TRANSACTIONS;

  // Determine typical monthly spend dynamically
  let typicalMonth: number;
  if (isDemoDataset) {
    const monthTotals = BASELINE_MONTHS.map((m) => sum(Object.values(m.byCategory)));
    typicalMonth = median(monthTotals);
  } else {
    // Dynamically project typical monthly spend based on current dataset run rate and transaction velocity
    typicalMonth = roundRupee((mtdSum / Math.max(day, 1)) * dim);
  }

  const typicalMtd = (typicalMonth * day) / dim;
  const forecast = (mtdSum / Math.max(day, 1)) * dim;
  const vsBaselinePct = typicalMtd === 0 ? 0 : ((mtdSum - typicalMtd) / typicalMtd) * 100;

  const categories: CategoryPulse[] = CATEGORIES.map((category) => {
    const catTxs = current.filter((t) => t.category === category);
    const currentAmt = sum(catTxs.map((t) => t.amount));

    let typical: number;
    if (isDemoDataset) {
      typical = median(BASELINE_MONTHS.map((m) => m.byCategory[category]));
    } else {
      // Dynamic baseline for uploaded data: estimate monthly normal spend for this category
      if (catTxs.length > 0) {
        typical = Math.round((currentAmt / Math.max(day, 1)) * dim);
      } else {
        typical = Math.round((typicalMonth * 0.15));
      }
    }

    const delta = currentAmt - typical;
    const deltaPct = typical === 0 ? 0 : (delta / typical) * 100;

    return {
      category,
      current: {
        value: currentAmt,
        kind: "OBSERVED",
        label: "This month so far",
        why: `${formatINR(currentAmt)} is OBSERVED from the sum of ${catTxs.length} ${category} records in the active dataset.`,
      },
      typical: {
        value: typical,
        kind: "CALCULATED",
        label: "Your normal spending",
        why: `${formatINR(typical)} is CALCULATED as your normal monthly spending for ${category}.`,
      },
      delta,
      deltaPct,
    };
  });

  // Calculate dynamic anomalies for Food, Shopping, and other active categories
  const anomalies: Anomaly[] = [];

  for (const cat of CATEGORIES) {
    const catTxs = current.filter((t) => t.category === cat);
    if (catTxs.length === 0) continue;

    const amounts = catTxs.map((t) => t.amount);
    let stats = iqrStats(amounts);

    // Fall back to historical food stats if demo dataset Food has only few rows
    if (cat === "Food" && isDemoDataset) {
      stats = iqrStats(FOOD_TXN_HISTORY);
    }

    for (const t of catTxs) {
      const ratio = stats.median > 0 ? t.amount / stats.median : 1;
      const isOutlier = t.amount > stats.fenceHigh || (ratio >= 1.75 && t.amount > 1000);

      if (isOutlier) {
        anomalies.push({
          tx: t,
          median: stats.median,
          q1: stats.q1,
          q3: stats.q3,
          ratio,
          fenceHigh: stats.fenceHigh,
          why: `${formatINR(t.amount)} at ${t.merchant} is ${ratio.toFixed(2)}x your normal ${cat} median of ${formatINR(stats.median)}. Normal range is ${formatINR(stats.q1)} to ${formatINR(stats.q3)}.`,
        });
      }
    }
  }

  // Sort by ratio or deviation magnitude
  anomalies.sort((a, b) => b.ratio - a.ratio);

  const leaks = LEAKS.map((leak) => {
    const perHour = leak.usageHours ? leak.monthlyAmount / leak.usageHours : null;
    return {
      leak,
      perHour,
      why: perHour
        ? `${formatINR(leak.monthlyAmount)} / ${leak.usageHours} hours = ${formatINR(perHour)} per hour. Calculated from plan cost and usage.`
        : `${formatINR(leak.monthlyAmount)} is summed from matching ${leak.category} transactions.`,
    };
  });

  return {
    asOf,
    dayOfMonth: day,
    daysInMonth: dim,
    remainingDays: dim - day,
    mtd: {
      value: mtdSum,
      kind: "OBSERVED",
      label: "Monthly spending so far",
      why: `${formatINR(mtdSum)} is OBSERVED as the sum of current month transactions in the active dataset.`,
    },
    typicalMonth: {
      value: typicalMonth,
      kind: "CALCULATED",
      label: "Your normal spending",
      why: `${formatINR(typicalMonth)} is CALCULATED as the benchmark for a normal monthly cycle.`,
    },
    typicalMtd: {
      value: typicalMtd,
      kind: "CALCULATED",
      label: "Typical by today",
      why: `${formatINR(typicalMtd)} is CALCULATED as normal month x ${day}/${dim} days elapsed.`,
    },
    vsBaselinePct,
    forecast: {
      value: roundRupee(forecast),
      kind: "PREDICTED",
      label: "End-of-month estimate",
      why: `${formatINR(forecast)} is PREDICTED as (spending so far / ${day}) x ${dim} days. It is an end-of-month estimate, not a guarantee.`,
    },
    forecastDelta: roundRupee(forecast - typicalMonth),
    categories,
    anomalies,
    transactions: [...current].sort((a, b) => (a.date < b.date ? 1 : -1)),
    leaks,
  };
}

export function buildGoalView(goal: Goal): GoalView {
  const remaining = Math.max(0, goal.target - goal.saved);
  const months = goal.monthlySavingsRate > 0 ? remaining / goal.monthlySavingsRate : 0;
  const daily = goal.monthlySavingsRate > 0 ? goal.monthlySavingsRate / 30 : 1;
  return {
    goal,
    remaining: {
      value: remaining,
      kind: "CALCULATED",
      label: "Remaining",
      why: `${formatINR(remaining)} is CALCULATED as ${formatINR(goal.target)} - ${formatINR(goal.saved)}.`,
    },
    progressPct: Math.min(100, (goal.saved / Math.max(goal.target, 1)) * 100),
    monthsWithoutPurchase: {
      value: months,
      kind: "GOAL IMPACT",
      label: "Without extra purchase",
      why: `~${months.toFixed(1)} months is GOAL IMPACT based on remaining ${formatINR(remaining)} / monthly savings rate ${formatINR(goal.monthlySavingsRate)}.`,
    },
    dailySavings: daily,
  };
}

export function buildPurchaseImpact(
  snapshot: Snapshot,
  goal: Goal,
  product: SharedProduct,
  amount: number
): PurchaseImpact {
  const shopping = snapshot.categories.find((c) => c.category === "Shopping");
  const baseline = shopping && shopping.typical.value > 0 ? shopping.typical.value : 1800;
  const relative = baseline === 0 ? 1 : amount / baseline;
  const gv = buildGoalView(goal);
  const remainingAfter = gv.remaining.value + amount;
  const monthsWith = goal.monthlySavingsRate > 0 ? remainingAfter / goal.monthlySavingsRate : 0;
  const delayDays = gv.dailySavings > 0 ? amount / gv.dailySavings : 0;
  const monthEndWith = snapshot.forecast.value + amount;

  return {
    product,
    goalName: goal.name,
    goalTarget: goal.target,
    goalSaved: goal.saved,
    amount: {
      value: amount,
      kind: "OBSERVED",
      label: "Shared price",
      why: `${formatINR(amount)} is OBSERVED from the shared product price (or the live what-if amount you set).`,
    },
    categoryBaseline: {
      value: baseline,
      kind: "CALCULATED",
      label: "Shopping baseline",
      why: `${formatINR(baseline)} / month is CALCULATED as your normal monthly Shopping spending.`,
    },
    relativeSpend: {
      value: relative,
      kind: "CALCULATED",
      label: "Relative spend",
      why: `${relative.toFixed(1)}x is CALCULATED as ${formatINR(amount)} / normal monthly shopping ${formatINR(baseline)}.`,
    },
    remainingAfter: {
      value: remainingAfter,
      kind: "GOAL IMPACT",
      label: "Goal remaining if purchased",
      why: `${formatINR(remainingAfter)} is GOAL IMPACT: current remaining ${formatINR(gv.remaining.value)} + purchase ${formatINR(amount)}.`,
    },
    monthsWithPurchase: {
      value: monthsWith,
      kind: "GOAL IMPACT",
      label: "With this purchase",
      why: `~${monthsWith.toFixed(1)} months is GOAL IMPACT based on ${formatINR(remainingAfter)} / ${formatINR(goal.monthlySavingsRate)} per month.`,
    },
    monthsWithout: gv.monthsWithoutPurchase,
    delayDays: {
      value: delayDays,
      kind: "GOAL IMPACT",
      label: "Estimated delay",
      why: `${formatDays(delayDays)} is GOAL IMPACT based on monthly savings rate ${formatINR(goal.monthlySavingsRate)} / 30 = ${formatINR(gv.dailySavings)} per day.`,
    },
    delayMonths: Math.max(0, monthsWith - gv.monthsWithoutPurchase.value),
    monthEndWithPurchase: {
      value: monthEndWith,
      kind: "PREDICTED",
      label: "Month-end if purchased",
      why: `${formatINR(monthEndWith)} is PREDICTED as current month-end estimate ${formatINR(snapshot.forecast.value)} + purchase ${formatINR(amount)}.`,
    },
  };
}

export function buildFutureSim(goal: Goal, cuts: Record<string, number>): FutureSim {
  const monthlyImprovement = sum(Object.values(cuts).map((v) => (v < 0 ? -v : 0)));
  const currentRate = goal.monthlySavingsRate;
  const simulatedRate = currentRate + monthlyImprovement;
  const remaining = Math.max(0, goal.target - goal.saved);
  const currentMonths = currentRate > 0 ? remaining / currentRate : 0;
  const simulatedMonths = simulatedRate <= 0 ? 0 : remaining / simulatedRate;
  return {
    cuts,
    monthlyImprovement: {
      value: monthlyImprovement,
      kind: "CALCULATED",
      label: "Monthly improvement",
      why: `${formatINR(monthlyImprovement)} is CALCULATED as the sum of simulated monthly reductions.`,
    },
    currentMonths: {
      value: currentMonths,
      kind: "GOAL IMPACT",
      label: "Current path",
      why: `~${currentMonths.toFixed(1)} months is GOAL IMPACT from remaining / current savings rate.`,
    },
    simulatedMonths: {
      value: simulatedMonths,
      kind: "GOAL IMPACT",
      label: "Simulated path",
      why: `~${simulatedMonths.toFixed(1)} months is GOAL IMPACT from remaining / (current rate + ${formatINR(monthlyImprovement)}).`,
    },
    currentRate,
    simulatedRate,
  };
}

export function filterTransactions(
  rows: Transaction[],
  q: string,
  category: Category | "All",
  range: "all" | "7d" | "30d" | "month"
): Transaction[] {
  const query = q.trim().toLowerCase();
  const asOf = AS_OF.getTime();
  return rows.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (query && !`${t.merchant} ${t.category} ${t.amount}`.toLowerCase().includes(query)) {
      return false;
    }
    if (range === "all") return true;
    const ts = new Date(t.date).getTime();
    if (range === "month") return inCurrentMonth(t, AS_OF);
    if (range === "7d") return asOf - ts <= 7 * 86400000;
    if (range === "30d") return asOf - ts <= 30 * 86400000;
    return true;
  });
}
