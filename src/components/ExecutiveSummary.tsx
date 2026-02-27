"use client";

import { useState } from "react";
import { Transaction, CardKey } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import { calcCardPoints } from "@/lib/classify";
import { getBiltCashBreakdown } from "@/lib/biltCash";

interface Props {
  transactions: Transaction[];
  selectedCards: [CardKey, CardKey, CardKey];
  monthlyRent: number;
  biltCashEnabled: boolean;
  monthlyBiltEcosystemSpend: number;
}

export default function ExecutiveSummary({
  transactions,
  selectedCards,
  monthlyRent,
  biltCashEnabled,
  monthlyBiltEcosystemSpend,
}: Props) {
  const [benefitsVisible, setBenefitsVisible] = useState(false);
  const charges = transactions.filter((r) => r.amount < 0);
  const totalSpend = charges.reduce((s, r) => s + Math.abs(r.amount), 0);

  const infos = selectedCards.map((key) => {
    const card = CARDS[key];
    let pts = calcCardPoints(key, charges);
    if (key === "bilt" && biltCashEnabled && monthlyRent > 0) {
      pts += getBiltCashBreakdown(totalSpend, monthlyRent, true, monthlyBiltEcosystemSpend).rentPtsCaptured;
    }
    return {
      key,
      name: card.name,
      pts,
      af: card.af,
      credits: card.credits,
      creditDetails: card.creditDetails,
    };
  });

  const bc = getBiltCashBreakdown(totalSpend, monthlyRent, biltCashEnabled, monthlyBiltEcosystemSpend);
  const hasBilt = selectedCards.includes("bilt");

  const valOrDash = (key: CardKey, val: number) =>
    key === "bilt" ? "$" + val.toFixed(2) : "—";

  return (
    <div className="p-4 bg-bg rounded-lg border border-border mb-5">
      <h3 className="text-base font-semibold mb-1">1 Card Summary</h3>
      <p className="text-xs text-muted mb-3">
        Points projection if all spend goes on a single card. No points value assumed.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 bg-bg text-muted font-semibold border-b border-border">
                Metric
              </th>
              {infos.map((c) => (
                <th
                  key={c.key}
                  className="text-right p-2 bg-bg text-muted font-semibold border-b border-border"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b border-border">Total Points</td>
              {infos.map((c) => (
                <td
                  key={c.key}
                  className="text-right p-2 border-b border-border"
                >
                  {Math.round(c.pts).toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 border-b border-border">Annual Fee</td>
              {infos.map((c) => (
                <td
                  key={c.key}
                  className="text-right p-2 border-b border-border"
                >
                  ${c.af}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 border-b border-border">
                Points / Annual Fee
              </td>
              {infos.map((c) => (
                <td
                  key={c.key}
                  className="text-right p-2 border-b border-border"
                >
                  {c.af > 0 ? (c.pts / c.af).toFixed(1) : "—"}
                </td>
              ))}
            </tr>

            {/* Benefits row */}
            <tr>
              <td className="p-2 border-b border-border">
                <button
                  className="text-accent underline text-sm"
                  onClick={() => setBenefitsVisible((v) => !v)}
                >
                  Additional benefits value{" "}
                  {benefitsVisible ? "▾" : "▸"}
                </button>
              </td>
              {infos.map((c) => (
                <td
                  key={c.key}
                  className="text-right p-2 border-b border-border"
                >
                  ${c.credits}
                </td>
              ))}
            </tr>
            {benefitsVisible && (
              <tr>
                <td className="p-1 border-b border-border" />
                {infos.map((c) => (
                  <td
                    key={c.key}
                    className="text-right p-2 border-b border-border text-xs text-muted align-top"
                  >
                    {c.creditDetails.length > 0 ? (
                      <ul className="list-disc pl-4 text-left">
                        {c.creditDetails.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
            )}

            {/* Bilt Cash rows */}
            {hasBilt && (
              <>
                <tr>
                  <td className="p-2 border-b border-border">
                    Total Bilt Cash earned (4% of spend)
                  </td>
                  {infos.map((c) => (
                    <td
                      key={c.key}
                      className="text-right p-2 border-b border-border"
                    >
                      {valOrDash(c.key, bc.biltCashEarned)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 border-b border-border">
                    Bilt Cash needed for full rent redemption
                  </td>
                  {infos.map((c) => (
                    <td
                      key={c.key}
                      className="text-right p-2 border-b border-border"
                    >
                      {valOrDash(c.key, bc.biltCashNeeded)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 border-b border-border">
                    Bilt Cash spent for rent points
                  </td>
                  {infos.map((c) => (
                    <td
                      key={c.key}
                      className="text-right p-2 border-b border-border"
                    >
                      {valOrDash(c.key, bc.biltCashSpent)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 border-b border-border">
                    Rent points captured
                  </td>
                  {infos.map((c) => (
                    <td
                      key={c.key}
                      className="text-right p-2 border-b border-border"
                    >
                      {c.key === "bilt"
                        ? bc.rentPtsCaptured.toLocaleString()
                        : "—"}
                    </td>
                  ))}
                </tr>
                {bc.ecosystemSpendAnnual > 0 && (
                  <tr>
                    <td className="p-2 border-b border-border">
                      Bilt Cash used on ecosystem (Lyft, fitness, etc.)
                    </td>
                    {infos.map((c) => (
                      <td
                        key={c.key}
                        className="text-right p-2 border-b border-border"
                      >
                        {valOrDash(c.key, bc.ecosystemSpendAnnual)}
                      </td>
                    ))}
                  </tr>
                )}
                <tr>
                  <td className="p-2 border-b border-border">
                    Remainder Bilt Cash
                  </td>
                  {infos.map((c) => (
                    <td
                      key={c.key}
                      className="text-right p-2 border-b border-border"
                    >
                      {valOrDash(c.key, bc.biltCashRemainder)}
                    </td>
                  ))}
                </tr>
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
                {bc.shortfall > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-2 text-xs border-b border-border"
                    >
                      <span className="text-negative font-semibold">
                        Shortfall: ${bc.shortfall.toFixed(2)} Bilt Cash. Need $
                        {bc.monthlySpendNeeded.toFixed(0)}/mo card spend to
                        cover full rent + ecosystem.
                      </span>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
