"use client";

import { useState, useMemo } from "react";
import { Transaction, CardKey, CARD_KEYS } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import { getSpendByCategory } from "@/lib/classify";
import { getBiltCashBreakdown } from "@/lib/biltCash";
import ExecutiveSummary from "./ExecutiveSummary";
import PieChart from "./PieChart";
import PointsByCategory from "./PointsByCategory";
import TwoCardOptimizer from "./TwoCardOptimizer";

interface Props {
  transactions: Transaction[];
  selectedCards: [CardKey, CardKey, CardKey];
  onSelectedCardsChange: (cards: [CardKey, CardKey, CardKey]) => void;
  monthlyRent: number;
  onMonthlyRentChange: (v: number) => void;
  biltCashEnabled: boolean;
  onBiltCashEnabledChange: (v: boolean) => void;
  monthlyBiltEcosystemSpend: number;
  onMonthlyBiltEcosystemSpendChange: (v: number) => void;
}

export default function CardComparison({
  transactions,
  selectedCards,
  onSelectedCardsChange,
  monthlyRent,
  onMonthlyRentChange,
  biltCashEnabled,
  onBiltCashEnabledChange,
  monthlyBiltEcosystemSpend,
  onMonthlyBiltEcosystemSpendChange,
}: Props) {
  const [pieCard1, setPieCard1] = useState("");
  const [pieCard2, setPieCard2] = useState("");

  const cardOptions = useMemo(
    () => [...new Set(transactions.map((r) => r.card))].sort(),
    [transactions]
  );

  const charges = transactions.filter((r) => r.amount < 0);
  const totalSpend = charges.reduce((s, r) => s + Math.abs(r.amount), 0);

  const pie1Data = useMemo(() => {
    const rows = pieCard1
      ? charges.filter((r) => r.card === pieCard1)
      : charges;
    return getSpendByCategory(rows);
  }, [charges, pieCard1]);

  const pie2Data = useMemo(() => {
    const rows = pieCard2
      ? charges.filter((r) => r.card === pieCard2)
      : charges;
    return getSpendByCategory(rows);
  }, [charges, pieCard2]);

  const pointsTxns = useMemo(() => {
    return pieCard1
      ? transactions.filter((r) => r.card === pieCard1)
      : transactions;
  }, [transactions, pieCard1]);

  const bc = getBiltCashBreakdown(totalSpend, monthlyRent, biltCashEnabled, monthlyBiltEcosystemSpend);

  function setCard(idx: 0 | 1 | 2, key: CardKey) {
    const next = [...selectedCards] as [CardKey, CardKey, CardKey];
    next[idx] = key;
    onSelectedCardsChange(next);
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-6">
      <h2 className="text-base font-semibold mb-3">Card Comparison</h2>

      {/* Rent + ecosystem inputs */}
      <div className="flex flex-wrap gap-4 mb-3">
        <div>
          <label className="block text-xs text-muted mb-1">
            Monthly rent or mortgage ($)
          </label>
          <input
            type="number"
            min={0}
            step={100}
            placeholder="e.g. 2500"
            className="w-28 bg-bg border border-border text-text px-2 py-1.5 rounded-md text-sm"
            value={monthlyRent || ""}
            onChange={(e) =>
              onMonthlyRentChange(parseFloat(e.target.value) || 0)
            }
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">
            Monthly Bilt ecosystem spend ($)
          </label>
          <input
            type="number"
            min={0}
            step={10}
            placeholder="e.g. 50"
            title="Lyft credits, fitness classes, dining, etc. redeemed with Bilt Cash"
            className="w-28 bg-bg border border-border text-text px-2 py-1.5 rounded-md text-sm"
            value={monthlyBiltEcosystemSpend || ""}
            onChange={(e) =>
              onMonthlyBiltEcosystemSpendChange(
                parseFloat(e.target.value) || 0
              )
            }
          />
          <p className="text-[10px] text-muted mt-0.5">
            Lyft, fitness, dining credits, etc.
          </p>
        </div>
      </div>

      {/* Bilt Cash toggle */}
      <div className="mb-4 text-xs">
        <label className="flex items-center gap-2 text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={biltCashEnabled}
            onChange={(e) => onBiltCashEnabledChange(e.target.checked)}
            className="w-auto"
          />
          Convert Bilt Cash to points on rent/mortgage ($30 Bilt Cash per $1,000
          rent = 1 pt per $1 rent)
        </label>
        {totalSpend > 0 && (
          <div className="mt-1 text-accent">
            Bilt Cash earned: ${bc.biltCashEarned.toFixed(2)}/yr (4% of $
            {totalSpend.toFixed(0)} spend)
            {bc.ecosystemSpendAnnual > 0 && (
              <span>
                {" "}
                − ${bc.ecosystemSpendAnnual.toFixed(0)} ecosystem
              </span>
            )}
            {biltCashEnabled && monthlyRent > 0 && (
              <>
                {" "}
                → {bc.rentPtsCaptured.toLocaleString()} rent pts (costs $
                {bc.biltCashSpent.toFixed(2)} Bilt Cash)
                {bc.shortfall > 0 && (
                  <span className="text-negative">
                    {" "}
                    | Shortfall: ${bc.shortfall.toFixed(2)}
                  </span>
                )}
                {bc.carryoverExcess > 0 && (
                  <span className="text-negative">
                    {" "}
                    | ${bc.carryoverExcess.toFixed(0)} over $100 carryover limit
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Card selectors */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        {(["Current Card", "Compare Card 1", "Compare Card 2"] as const).map(
          (label, idx) => (
            <div key={label}>
              <label className="block text-xs text-muted mb-1">{label}</label>
              <select
                className="min-w-[160px] bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
                value={selectedCards[idx]}
                onChange={(e) =>
                  setCard(idx as 0 | 1 | 2, e.target.value as CardKey)
                }
              >
                {CARD_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CARDS[k].name}
                  </option>
                ))}
              </select>
            </div>
          )
        )}
      </div>

      {/* 1 Card Summary */}
      <ExecutiveSummary
        transactions={transactions}
        selectedCards={selectedCards}
        monthlyRent={monthlyRent}
        biltCashEnabled={biltCashEnabled}
        monthlyBiltEcosystemSpend={monthlyBiltEcosystemSpend}
      />

      {/* 2 Card Optimizer */}
      <TwoCardOptimizer
        transactions={transactions}
        monthlyRent={monthlyRent}
        biltCashEnabled={biltCashEnabled}
        monthlyBiltEcosystemSpend={monthlyBiltEcosystemSpend}
      />

      {/* Pie charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <select
            className="mb-3 bg-surface border border-border text-text px-2 py-1 rounded text-xs"
            value={pieCard1}
            onChange={(e) => setPieCard1(e.target.value)}
          >
            <option value="">All cards</option>
            {cardOptions.map((c) => (
              <option key={c} value={c}>
                Card ****{c}
              </option>
            ))}
          </select>
          <PieChart title="Spend by category" data={pie1Data} />
        </div>
        <div>
          <select
            className="mb-3 bg-surface border border-border text-text px-2 py-1 rounded text-xs"
            value={pieCard2}
            onChange={(e) => setPieCard2(e.target.value)}
          >
            <option value="">All cards</option>
            {cardOptions.map((c) => (
              <option key={c} value={c}>
                Card ****{c}
              </option>
            ))}
          </select>
          <PieChart title="Spend by category" data={pie2Data} />
        </div>
      </div>

      {/* Points by category */}
      <PointsByCategory
        transactions={pointsTxns}
        selectedCards={selectedCards}
        monthlyRent={monthlyRent}
        biltCashEnabled={biltCashEnabled}
        monthlyBiltEcosystemSpend={monthlyBiltEcosystemSpend}
        filterLabel={pieCard1 ? `Card ****${pieCard1}` : undefined}
      />
    </div>
  );
}
