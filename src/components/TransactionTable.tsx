"use client";

import { useState, useMemo } from "react";
import { Transaction, CardKey } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import { getTxnMultiplier } from "@/lib/classify";

interface Props {
  transactions: Transaction[];
  selectedCards: [CardKey, CardKey, CardKey];
}

type SortCol =
  | "transactionDate"
  | "card"
  | "description"
  | "category"
  | "type"
  | "amount"
  | "ptsA"
  | "ptsB"
  | "ptsC";

export default function TransactionTable({
  transactions,
  selectedCards,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterCard, setFilterCard] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("transactionDate");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const cards = useMemo(
    () => [...new Set(transactions.map((r) => r.card))].sort(),
    [transactions]
  );
  const categories = useMemo(
    () =>
      [...new Set(transactions.map((r) => r.category))].filter(Boolean).sort(),
    [transactions]
  );
  const types = useMemo(
    () =>
      [...new Set(transactions.map((r) => r.type))].filter(Boolean).sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = transactions.filter((r) => {
      if (filterCard && r.card !== filterCard) return false;
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterType && r.type !== filterType) return false;
      if (q) {
        const text = [r.description, r.category, r.type]
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    const [cardA, cardB, cardC] = selectedCards;
    rows = [...rows].sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortCol === "ptsA") {
        va =
          a.amount < 0
            ? Math.abs(a.amount) * getTxnMultiplier(cardA, a)
            : 0;
        vb =
          b.amount < 0
            ? Math.abs(b.amount) * getTxnMultiplier(cardA, b)
            : 0;
      } else if (sortCol === "ptsB") {
        va =
          a.amount < 0
            ? Math.abs(a.amount) * getTxnMultiplier(cardB, a)
            : 0;
        vb =
          b.amount < 0
            ? Math.abs(b.amount) * getTxnMultiplier(cardB, b)
            : 0;
      } else if (sortCol === "ptsC") {
        va =
          a.amount < 0
            ? Math.abs(a.amount) * getTxnMultiplier(cardC, a)
            : 0;
        vb =
          b.amount < 0
            ? Math.abs(b.amount) * getTxnMultiplier(cardC, b)
            : 0;
      } else if (sortCol === "amount") {
        va = a.amount;
        vb = b.amount;
      } else if (sortCol === "transactionDate") {
        va = new Date(a.transactionDate).getTime() || 0;
        vb = new Date(b.transactionDate).getTime() || 0;
      } else {
        va = String(a[sortCol as keyof Transaction]);
        vb = String(b[sortCol as keyof Transaction]);
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return rows;
  }, [
    transactions,
    search,
    filterCard,
    filterCategory,
    filterType,
    sortCol,
    sortDir,
    selectedCards,
  ]);

  const charges = filtered.filter((r) => r.amount < 0);
  const credits = filtered.filter((r) => r.amount > 0);
  const sumCharges = charges.reduce((s, r) => s + r.amount, 0);
  const sumCredits = credits.reduce((s, r) => s + r.amount, 0);
  const net = sumCharges + sumCredits;

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }

  function thClass(col: SortCol) {
    let cls =
      "text-left p-2 bg-bg text-muted font-semibold whitespace-nowrap cursor-pointer select-none border-b border-border hover:text-accent text-xs";
    if (col === "amount" || col === "ptsA" || col === "ptsB" || col === "ptsC")
      cls += " text-right";
    return cls;
  }

  function sortIndicator(col: SortCol) {
    if (sortCol !== col) return "";
    return sortDir === 1 ? " ▲" : " ▼";
  }

  const [cardA, cardB, cardC] = selectedCards;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <input
          type="search"
          placeholder="Search description, category..."
          className="bg-surface border border-border text-text px-3 py-2 rounded-md text-sm min-w-[200px] placeholder:text-muted"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
          value={filterCard}
          onChange={(e) => setFilterCard(e.target.value)}
        >
          <option value="">All cards</option>
          {cards.map((c) => (
            <option key={c} value={c}>
              Card ****{c}
            </option>
          ))}
        </select>
        <select
          className="bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="bg-surface border border-border text-text px-3 py-2 rounded-md text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 mb-3 text-sm text-muted">
        <span>
          Showing <strong className="text-text">{filtered.length}</strong> of{" "}
          {transactions.length} transactions
        </span>
        <span className="text-negative">
          Charges:{" "}
          <strong>${Math.abs(sumCharges).toFixed(2)}</strong>
        </span>
        <span className="text-positive">
          Credits: <strong>${sumCredits.toFixed(2)}</strong>
        </span>
        <span>
          Net:{" "}
          <strong className={net >= 0 ? "text-positive" : "text-negative"}>
            ${net.toFixed(2)}
          </strong>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                className={thClass("transactionDate")}
                onClick={() => handleSort("transactionDate")}
              >
                Date{sortIndicator("transactionDate")}
              </th>
              <th
                className={thClass("card")}
                onClick={() => handleSort("card")}
              >
                Card{sortIndicator("card")}
              </th>
              <th
                className={thClass("description")}
                onClick={() => handleSort("description")}
              >
                Description{sortIndicator("description")}
              </th>
              <th
                className={thClass("category")}
                onClick={() => handleSort("category")}
              >
                Category{sortIndicator("category")}
              </th>
              <th
                className={thClass("type")}
                onClick={() => handleSort("type")}
              >
                Type{sortIndicator("type")}
              </th>
              <th
                className={thClass("amount")}
                onClick={() => handleSort("amount")}
              >
                Amount{sortIndicator("amount")}
              </th>
              <th
                className={thClass("ptsA")}
                onClick={() => handleSort("ptsA")}
              >
                {CARDS[cardA].name}
                {sortIndicator("ptsA")}
              </th>
              <th
                className={thClass("ptsB")}
                onClick={() => handleSort("ptsB")}
              >
                {CARDS[cardB].name}
                {sortIndicator("ptsB")}
              </th>
              <th
                className={thClass("ptsC")}
                onClick={() => handleSort("ptsC")}
              >
                {CARDS[cardC].name}
                {sortIndicator("ptsC")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const isCredit = r.amount >= 0;
              const amtStr =
                (isCredit ? "+" : "") +
                "$" +
                Math.abs(r.amount).toFixed(2);
              const amt = Math.abs(r.amount);
              const ptsA =
                r.amount < 0
                  ? Math.round(amt * getTxnMultiplier(cardA, r))
                  : 0;
              const ptsB =
                r.amount < 0
                  ? Math.round(amt * getTxnMultiplier(cardB, r))
                  : 0;
              const ptsC =
                r.amount < 0
                  ? Math.round(amt * getTxnMultiplier(cardC, r))
                  : 0;
              return (
                <tr
                  key={i}
                  className="hover:bg-accent/5"
                >
                  <td className="p-2 border-b border-border">
                    {r.transactionDate}
                  </td>
                  <td className="p-2 border-b border-border font-semibold text-muted">
                    ****{r.card}
                  </td>
                  <td className="p-2 border-b border-border">
                    {r.description}
                  </td>
                  <td className="p-2 border-b border-border">
                    {r.category}
                    {r.autoCategory && (
                      <span
                        className="ml-1 text-accent opacity-60"
                        title="Category auto-assigned from merchant name"
                      >
                        ✦
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-b border-border">{r.type}</td>
                  <td
                    className={`p-2 border-b border-border text-right tabular-nums ${
                      isCredit ? "text-positive" : "text-negative"
                    }`}
                  >
                    {amtStr}
                  </td>
                  <td className="p-2 border-b border-border text-right tabular-nums">
                    {r.amount < 0 ? ptsA.toLocaleString() : "—"}
                  </td>
                  <td className="p-2 border-b border-border text-right tabular-nums">
                    {r.amount < 0 ? ptsB.toLocaleString() : "—"}
                  </td>
                  <td className="p-2 border-b border-border text-right tabular-nums">
                    {r.amount < 0 ? ptsC.toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted">
            No transactions match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
