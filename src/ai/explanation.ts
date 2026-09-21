import { formatDays, formatINR } from "../engine/stats";
import type { Anomaly, PurchaseImpact, TrustValue } from "../engine/finance";

export type ExplanationPayload = {
  template: string;
  values: Record<string, string | number>;
  disclaimer: string;
};

export const EXPLAIN_DISCLAIMER = "Based on verified financial calculations. AI does not invent financial amounts.";

export function explainPurchase(impact: PurchaseImpact): ExplanationPayload {
  return {
    template:
      "You usually spend around {baseline} per month on Shopping. At {amount}, this purchase is {relative}x your normal monthly Shopping spending. Based on your {goalName} target and stored savings rate, this purchase is estimated to delay your goal completion by approximately {delay}.",
    values: {
      baseline: formatINR(impact.categoryBaseline.value),
      amount: formatINR(impact.amount.value),
      relative: impact.relativeSpend.value.toFixed(1),
      goalName: impact.goalName,
      delay: formatDays(impact.delayDays.value),
    },
    disclaimer: EXPLAIN_DISCLAIMER,
  };
}

export function renderExplanation(payload: ExplanationPayload): string {
  return payload.template.replace(/\{(\w+)\}/g, (_, k) => String(payload.values[k] ?? ""));
}

export function explainAnomaly(a: Anomaly): ExplanationPayload {
  return {
    template:
      "{amount} at {merchant} is {ratio}x your normal Food transaction median of {median}. Your typical range is {q1} to {q3}. This alert is triggered because the transaction sits above your normal spending pattern.",
    values: {
      amount: formatINR(a.tx.amount),
      merchant: a.tx.merchant,
      ratio: a.ratio.toFixed(1),
      median: formatINR(a.median),
      q1: formatINR(a.q1),
      q3: formatINR(a.q3),
    },
    disclaimer: EXPLAIN_DISCLAIMER,
  };
}

export function explainTrust(tv: TrustValue): ExplanationPayload {
  return {
    template: tv.why,
    values: {},
    disclaimer: EXPLAIN_DISCLAIMER,
  };
}
