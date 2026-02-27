"use client";

import { useState, useMemo } from "react";
import { Transaction, CardKey, CARD_KEYS, SpendCategory } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import { classifyTxn, getTxnMultiplier } from "@/lib/classify";
import { getBiltCashBreakdown } from "@/lib/biltCash";

interface Props {
  transactions: Transaction[];
  monthlyRent: number;
  biltCashEnabled: boolean;
  monthlyBiltEcosystemSpend: number;
}

const CATEGORY_LABELS: Record<SpendCategory, string> = {
  airline: "Airlines",
  hotel_direct: "Hotels (direct)",
  airbnb: "Airbnb / VRBO",
  dining: "Dining",
  rideshare: "Rideshare",
  streaming: "Streaming",
  groceries_online: "Online Groceries",
  groceries: "Groceries",
  travel_other: "Travel / Gas",
  other: "Everything Else",
};

const ALL_SPEND_CATEGORIES: SpendCategory[] = [
  "airline",
  "hotel_direct",
  "airbnb",
  "dining",
  "rideshare",
  "streaming",
  "groceries_online",
  "groceries",
  "travel_other",
  "other",
];

interface CategoryAssignment {
  category: SpendCategory;
  label: string;
  spend: number;
  assignedTo: "A" | "B";
  multA: number;
  multB: number;
  ptsA: number;
  ptsB: number;
}

export default function TwoCardOptimizer({
  transactions,
  monthlyRent,
  biltCashEnabled,
  monthlyBiltEcosystemSpend,
}: Props) {
  const [cardA, setCardA] = useState<CardKey>("csr");
  const [cardB, setCardB] = useState<CardKey>("bilt");
  const [benefitsVisible, setBenefitsVisible] = useState(false);

  const charges = useMemo(
    () => transactions.filter((r) => r.amount < 0),
    [transactions]
  );

  const optimization = useMemo(() => {
    // Group spend by SpendCategory
    const spendByCategory: Record<SpendCategory, number> = {} as Record<
      SpendCategory,
      number
    >;
    for (const cat of ALL_SPEND_CATEGORIES) spendByCategory[cat] = 0;

    for (const txn of charges) {
      const cls = classifyTxn(txn.description, txn.category);
      spendByCategory[cls] += Math.abs(txn.amount);
    }

    // For each category, determine which card earns more
    const assignments: CategoryAssignment[] = [];
    for (const cat of ALL_SPEND_CATEGORIES) {
      const spend = spendByCategory[cat];
      if (spend === 0) continue;

      // Build a dummy transaction to get multiplier for this category
      const dummyTxn: Transaction = {
        transactionDate: "",
        postDate: "",
        description: cat === "airline" ? "DELTA AIR" : "",
        category:
          cat === "dining"
            ? "Food & Drink"
            : cat === "groceries" || cat === "groceries_online"
              ? "Groceries"
              : cat === "travel_other"
                ? "Travel"
                : "",
        autoCategory: false,
        type: "Sale",
        amount: -1,
        card: "",
        memo: "",
      };

      const multA = getTxnMultiplier(cardA, dummyTxn);
      const multB = getTxnMultiplier(cardB, dummyTxn);

      // Use actual per-txn multipliers for accurate points
      let ptsIfA = 0;
      let ptsIfB = 0;
      for (const txn of charges) {
        const cls = classifyTxn(txn.description, txn.category);
        if (cls !== cat) continue;
        const amt = Math.abs(txn.amount);
        ptsIfA += amt * getTxnMultiplier(cardA, txn);
        ptsIfB += amt * getTxnMultiplier(cardB, txn);
      }

      const assignedTo = ptsIfA >= ptsIfB ? "A" : "B";

      assignments.push({
        category: cat,
        label: CATEGORY_LABELS[cat],
        spend,
        assignedTo,
        multA,
        multB,
        ptsA: Math.round(ptsIfA),
        ptsB: Math.round(ptsIfB),
      });
    }

    // Calculate totals
    let totalPtsA = 0;
    let totalPtsB = 0;
    let spendOnA = 0;
    let spendOnB = 0;

    for (const a of assignments) {
      if (a.assignedTo === "A") {
        totalPtsA += a.ptsA;
        spendOnA += a.spend;
      } else {
        totalPtsB += a.ptsB;
        spendOnB += a.spend;
      }
    }

    // Bilt Cash analysis (if either card is Bilt)
    const biltCard = cardA === "bilt" ? "A" : cardB === "bilt" ? "B" : null;
    let biltCashBreakdown = null;
    if (biltCard) {
      const biltSpend = biltCard === "A" ? spendOnA : spendOnB;
      biltCashBreakdown = getBiltCashBreakdown(
        biltSpend,
        monthlyRent,
        biltCashEnabled,
        monthlyBiltEcosystemSpend
      );
      if (biltCashEnabled && monthlyRent > 0) {
        if (biltCard === "A") {
          totalPtsA += biltCashBreakdown.rentPtsCaptured;
        } else {
          totalPtsB += biltCashBreakdown.rentPtsCaptured;
        }
      }
    }

    const combinedPts = totalPtsA + totalPtsB;
    const combinedAf = CARDS[cardA].af + CARDS[cardB].af;
    const combinedCredits = CARDS[cardA].credits + CARDS[cardB].credits;

    return {
      assignments,
      totalPtsA,
      totalPtsB,
      spendOnA,
      spendOnB,
      combinedPts,
      combinedAf,
      combinedCredits,
      biltCard,
      biltCashBreakdown,
    };
  }, [
    charges,
    cardA,
    cardB,
    monthlyRent,
    biltCashEnabled,
    monthlyBiltEcosystemSpend,
  ]);

  const cardAAssignments = optimization.assignments.filter(
    (a) => a.assignedTo === "A"
  );
  const cardBAssignments = optimization.assignments.filter(
    (a) => a.assignedTo === "B"
  );

  const bc = optimization.biltCashBreakdown;

  return (
    <div className="p-4 bg-bg rounded-lg border border-border mb-5">
      <h3 className="text-base font-semibold mb-1">2 Card Optimizer</h3>
      <p className="text-xs text-muted mb-3">
        Assigns each spending category to whichever card earns more points.
      </p>

      {/* Card selectors */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <label className="block text-xs text-muted mb-1">Card A</label>
          <select
            className="min-w-[160px] bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
            value={cardA}
            onChange={(e) => setCardA(e.target.value as CardKey)}
          >
            {CARD_KEYS.map((k) => (
              <option key={k} value={k}>
                {CARDS[k].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Card B</label>
          <select
            className="min-w-[160px] bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
            value={cardB}
            onChange={(e) => setCardB(e.target.value as CardKey)}
          >
            {CARD_KEYS.map((k) => (
              <option key={k} value={k}>
                {CARDS[k].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spend instructions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-md border border-border bg-surface">
          <p className="text-sm font-semibold mb-1.5">
            Use {CARDS[cardA].name} for:
          </p>
          {cardAAssignments.length > 0 ? (
            <ul className="text-xs text-muted space-y-0.5">
              {cardAAssignments.map((a) => (
                <li key={a.category}>
                  {a.label}{" "}
                  <span className="text-accent">({a.multA}x)</span> — $
                  {a.spend.toFixed(0)} → {a.ptsA.toLocaleString()} pts
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">
              No categories optimally assigned to this card.
            </p>
          )}
          <p className="text-sm font-semibold text-accent mt-2">
            {optimization.totalPtsA.toLocaleString()} pts
          </p>
        </div>
        <div className="p-3 rounded-md border border-border bg-surface">
          <p className="text-sm font-semibold mb-1.5">
            Use {CARDS[cardB].name} for:
          </p>
          {cardBAssignments.length > 0 ? (
            <ul className="text-xs text-muted space-y-0.5">
              {cardBAssignments.map((a) => (
                <li key={a.category}>
                  {a.label}{" "}
                  <span className="text-accent">({a.multB}x)</span> — $
                  {a.spend.toFixed(0)} → {a.ptsB.toLocaleString()} pts
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">
              No categories optimally assigned to this card.
            </p>
          )}
          <p className="text-sm font-semibold text-accent mt-2">
            {optimization.totalPtsB.toLocaleString()} pts
          </p>
        </div>
      </div>

      {/* Summary table */}
      <div className="overflow-x-auto rounded-lg border border-border mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-bg text-muted font-semibold border-b border-border">
                Metric
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                {CARDS[cardA].name}
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                {CARDS[cardB].name}
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                Combined
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b border-border">Total Points</td>
              <td className="text-right p-2 border-b border-border">
                {optimization.totalPtsA.toLocaleString()}
              </td>
              <td className="text-right p-2 border-b border-border">
                {optimization.totalPtsB.toLocaleString()}
              </td>
              <td className="text-right p-2 border-b border-border font-semibold text-accent">
                {optimization.combinedPts.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="p-2 border-b border-border">Spend Routed</td>
              <td className="text-right p-2 border-b border-border">
                ${optimization.spendOnA.toFixed(0)}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${optimization.spendOnB.toFixed(0)}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${(optimization.spendOnA + optimization.spendOnB).toFixed(0)}
              </td>
            </tr>
            <tr>
              <td className="p-2 border-b border-border">Annual Fee</td>
              <td className="text-right p-2 border-b border-border">
                ${CARDS[cardA].af}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${CARDS[cardB].af}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${optimization.combinedAf}
              </td>
            </tr>
            <tr>
              <td className="p-2 border-b border-border">
                Points / Combined Fee
              </td>
              <td className="text-right p-2 border-b border-border">—</td>
              <td className="text-right p-2 border-b border-border">—</td>
              <td className="text-right p-2 border-b border-border">
                {optimization.combinedAf > 0
                  ? (
                      optimization.combinedPts / optimization.combinedAf
                    ).toFixed(1)
                  : "—"}
              </td>
            </tr>
            <tr>
              <td className="p-2 border-b border-border">
                <button
                  className="text-accent underline text-sm"
                  onClick={() => setBenefitsVisible((v) => !v)}
                >
                  Benefits value {benefitsVisible ? "▾" : "▸"}
                </button>
              </td>
              <td className="text-right p-2 border-b border-border">
                ${CARDS[cardA].credits}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${CARDS[cardB].credits}
              </td>
              <td className="text-right p-2 border-b border-border">
                ${optimization.combinedCredits}
              </td>
            </tr>
            {benefitsVisible && (
              <tr>
                <td className="p-1 border-b border-border" />
                <td className="text-right p-2 border-b border-border text-xs text-muted align-top">
                  <ul className="list-disc pl-4 text-left">
                    {CARDS[cardA].creditDetails.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </td>
                <td className="text-right p-2 border-b border-border text-xs text-muted align-top">
                  <ul className="list-disc pl-4 text-left">
                    {CARDS[cardB].creditDetails.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-2 border-b border-border" />
              </tr>
            )}

            {/* Bilt Cash rows */}
            {bc && (
              <>
                <tr>
                  <td className="p-2 border-b border-border">
                    Bilt Cash earned (4% of Bilt spend)
                  </td>
                  <td className="text-right p-2 border-b border-border">
                    {cardA === "bilt"
                      ? "$" + bc.biltCashEarned.toFixed(2)
                      : "—"}
                  </td>
                  <td className="text-right p-2 border-b border-border">
                    {cardB === "bilt"
                      ? "$" + bc.biltCashEarned.toFixed(2)
                      : "—"}
                  </td>
                  <td className="text-right p-2 border-b border-border">—</td>
                </tr>
                {bc.ecosystemSpendAnnual > 0 && (
                  <tr>
                    <td className="p-2 border-b border-border">
                      Bilt Cash used on ecosystem
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      {cardA === "bilt"
                        ? "$" + bc.ecosystemSpendAnnual.toFixed(2)
                        : "—"}
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      {cardB === "bilt"
                        ? "$" + bc.ecosystemSpendAnnual.toFixed(2)
                        : "—"}
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      —
                    </td>
                  </tr>
                )}
                {biltCashEnabled && monthlyRent > 0 && (
                  <tr>
                    <td className="p-2 border-b border-border">
                      Rent points captured
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      {cardA === "bilt"
                        ? bc.rentPtsCaptured.toLocaleString()
                        : "—"}
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      {cardB === "bilt"
                        ? bc.rentPtsCaptured.toLocaleString()
                        : "—"}
                    </td>
                    <td className="text-right p-2 border-b border-border">
                      —
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="p-2 border-b border-border">
                    Remainder Bilt Cash
                  </td>
                  <td className="text-right p-2 border-b border-border">
                    {cardA === "bilt"
                      ? "$" + bc.biltCashRemainder.toFixed(2)
                      : "—"}
                  </td>
                  <td className="text-right p-2 border-b border-border">
                    {cardB === "bilt"
                      ? "$" + bc.biltCashRemainder.toFixed(2)
                      : "—"}
                  </td>
                  <td className="text-right p-2 border-b border-border">—</td>
                </tr>
                {bc.shortfall > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-2 text-xs border-b border-border"
                    >
                      <span className="text-negative font-semibold">
                        Shortfall: ${bc.shortfall.toFixed(2)} Bilt Cash. Need
                        more spend on Bilt or reduce rent/ecosystem usage.
                      </span>
                    </td>
                  </tr>
                )}
                {bc.carryoverExcess > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-2 text-xs border-b border-border"
                    >
                      <span className="text-negative font-semibold">
                        Warning: ${bc.carryoverExcess.toFixed(2)} in Bilt Cash
                        exceeds the $100/yr carryover limit and will expire.
                      </span>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Per-category breakdown table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-bg text-muted font-semibold border-b border-border">
                Category
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                Spend
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                {CARDS[cardA].name}
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                {CARDS[cardB].name}
              </th>
              <th className="text-left p-2 bg-bg text-muted font-semibold border-b border-border">
                Best Card
              </th>
            </tr>
          </thead>
          <tbody>
            {optimization.assignments.map((a) => (
              <tr key={a.category}>
                <td className="p-2 border-b border-border">{a.label}</td>
                <td className="text-right p-2 border-b border-border">
                  ${a.spend.toFixed(0)}
                </td>
                <td
                  className={`text-right p-2 border-b border-border ${
                    a.assignedTo === "A" ? "text-accent font-semibold" : ""
                  }`}
                >
                  {a.ptsA.toLocaleString()} ({a.multA}x)
                </td>
                <td
                  className={`text-right p-2 border-b border-border ${
                    a.assignedTo === "B" ? "text-accent font-semibold" : ""
                  }`}
                >
                  {a.ptsB.toLocaleString()} ({a.multB}x)
                </td>
                <td className="p-2 border-b border-border text-accent">
                  {a.assignedTo === "A"
                    ? CARDS[cardA].name
                    : CARDS[cardB].name}
                </td>
              </tr>
            ))}
            <tr className="font-semibold bg-bg">
              <td className="p-2">Total</td>
              <td className="text-right p-2">
                ${(optimization.spendOnA + optimization.spendOnB).toFixed(0)}
              </td>
              <td className="text-right p-2">
                {optimization.totalPtsA.toLocaleString()}
              </td>
              <td className="text-right p-2">
                {optimization.totalPtsB.toLocaleString()}
              </td>
              <td className="p-2 text-accent">
                {optimization.combinedPts.toLocaleString()} combined
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
