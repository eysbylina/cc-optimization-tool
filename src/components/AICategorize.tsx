"use client";

import { useState } from "react";
import { Transaction } from "@/lib/types";

interface Props {
  transactions: Transaction[];
  onUpdate: (txns: Transaction[]) => void;
}

export default function AICategorize({ transactions, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const uncategorized = transactions.filter(
    (t) => !t.category && t.amount < 0
  );

  if (uncategorized.length === 0 && !done) return null;
  if (done) {
    return (
      <div className="mb-4 p-3 rounded-md border border-positive/30 bg-positive/5 text-sm text-positive">
        AI categorization complete — categories updated for uncategorized
        transactions.
      </div>
    );
  }

  async function handleCategorize() {
    setLoading(true);
    setError(null);

    const descriptions = uncategorized.map((t) => t.description);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 501) {
          setError(
            "AI categorization requires an OPENAI_API_KEY environment variable. " +
              "Add it to your .env.local file or Vercel project settings."
          );
        } else {
          setError(data.error || `API error: ${res.status}`);
        }
        setLoading(false);
        return;
      }

      const { categories } = await res.json();

      const uncatSet = new Set(
        uncategorized.map((t) => t.description + "|" + t.transactionDate)
      );
      let idx = 0;
      const updated = transactions.map((t) => {
        const key = t.description + "|" + t.transactionDate;
        if (uncatSet.has(key) && !t.category && idx < categories.length) {
          const cat = categories[idx];
          idx++;
          if (cat) {
            return { ...t, category: cat, autoCategory: true };
          }
        }
        return t;
      });

      onUpdate(updated);
      setDone(true);
    } catch (e) {
      setError(
        `Network error: ${e instanceof Error ? e.message : "Unknown"}`
      );
    }
    setLoading(false);
  }

  return (
    <div className="mb-4 p-3 rounded-md border border-accent/30 bg-accent/5">
      <p className="text-sm text-muted mb-2">
        <strong className="text-text">{uncategorized.length}</strong>{" "}
        transactions have no category. The pattern-based lookup couldn&apos;t
        match them. You can use AI to auto-categorize them.
      </p>
      <button
        className="px-3 py-1.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
        onClick={handleCategorize}
        disabled={loading}
      >
        {loading ? "Categorizing…" : "Auto-categorize with AI"}
      </button>
      {error && <p className="text-negative text-xs mt-2">{error}</p>}
    </div>
  );
}
