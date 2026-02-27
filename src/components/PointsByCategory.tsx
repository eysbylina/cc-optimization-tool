"use client";

import { Transaction, CardKey } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import { getSpendByCategory, getPointsByCategoryForCard } from "@/lib/classify";
import { getBiltCashBreakdown } from "@/lib/biltCash";

interface Props {
  transactions: Transaction[];
  selectedCards: [CardKey, CardKey, CardKey];
  monthlyRent: number;
  biltCashEnabled: boolean;
  filterLabel?: string;
}

export default function PointsByCategory({
  transactions,
  selectedCards,
  monthlyRent,
  biltCashEnabled,
  filterLabel,
}: Props) {
  const charges = transactions.filter((r) => r.amount < 0);
  const spendByCat = getSpendByCategory(charges);
  const ptsByCat = selectedCards.map((k) =>
    getPointsByCategoryForCard(k, charges)
  );
  const cats = Object.keys(spendByCat).sort();
  const totals = [0, 0, 0];
  let totalSpend = 0;

  const hasBilt = selectedCards.includes("bilt");
  const bc = getBiltCashBreakdown(
    charges.reduce((s, r) => s + Math.abs(r.amount), 0),
    monthlyRent,
    biltCashEnabled
  );

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-muted mb-2">
        Points by category{" "}
        {filterLabel && (
          <span className="font-normal text-xs text-accent">
            — {filterLabel}
          </span>
        )}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-bg text-muted font-semibold border-b border-border">
                Category
              </th>
              <th className="text-right p-2 bg-bg text-muted font-semibold border-b border-border">
                Spend
              </th>
              {selectedCards.map((k) => (
                <th
                  key={k}
                  className="text-right p-2 bg-bg text-muted font-semibold border-b border-border"
                >
                  {CARDS[k].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => {
              const spend = spendByCat[cat];
              totalSpend += spend;
              const pts = selectedCards.map((_, i) =>
                Math.round(ptsByCat[i][cat] || 0)
              );
              pts.forEach((p, i) => {
                totals[i] += p;
              });
              return (
                <tr key={cat}>
                  <td className="p-2 border-b border-border">{cat}</td>
                  <td className="text-right p-2 border-b border-border">
                    ${spend.toFixed(2)}
                  </td>
                  {pts.map((p, i) => (
                    <td
                      key={i}
                      className="text-right p-2 border-b border-border"
                    >
                      {p.toLocaleString()}
                    </td>
                  ))}
                </tr>
              );
            })}

            {hasBilt && biltCashEnabled && monthlyRent > 0 && (
              <tr>
                <td className="p-2 border-b border-border">
                  Rent points (via Bilt Cash)
                </td>
                <td className="text-right p-2 border-b border-border">
                  ${bc.biltCashSpent.toFixed(2)} Bilt Cash
                </td>
                {selectedCards.map((k, i) => {
                  if (k === "bilt") {
                    totals[i] += bc.rentPtsCaptured;
                    return (
                      <td
                        key={i}
                        className="text-right p-2 border-b border-border"
                      >
                        {bc.rentPtsCaptured.toLocaleString()} pts
                      </td>
                    );
                  }
                  return (
                    <td
                      key={i}
                      className="text-right p-2 border-b border-border"
                    >
                      —
                    </td>
                  );
                })}
              </tr>
            )}

            <tr className="font-semibold bg-bg">
              <td className="p-2">Total</td>
              <td className="text-right p-2">${totalSpend.toFixed(2)}</td>
              {totals.map((t, i) => (
                <td key={i} className="text-right p-2">
                  {t.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
