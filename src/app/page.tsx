"use client";

import { useState, useCallback, useMemo } from "react";
import { Transaction, CardKey } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import CardComparison from "@/components/CardComparison";
import TransactionTable from "@/components/TransactionTable";
import AICategorize from "@/components/AICategorize";
import CategoryBanner from "@/components/CategoryBanner";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCards, setSelectedCards] = useState<
    [CardKey, CardKey, CardKey]
  >(["csr", "bilt", "amex"]);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [biltCashEnabled, setBiltCashEnabled] = useState(false);

  const handleFilesLoaded = useCallback((txns: Transaction[]) => {
    setTransactions((prev) => {
      const all = [...prev, ...txns];
      all.sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
      );
      return all;
    });
  }, []);

  const handleReset = useCallback(() => {
    setTransactions([]);
  }, []);

  const hasData = transactions.length > 0;

  const categoryStats = useMemo(() => {
    if (!hasData) return { total: 0, fromStatement: 0, autoAssigned: 0, uncategorized: 0 };
    const charges = transactions.filter((t) => t.amount < 0);
    const fromStatement = charges.filter((t) => t.category && !t.autoCategory).length;
    const autoAssigned = charges.filter((t) => t.autoCategory).length;
    const uncategorized = charges.filter((t) => !t.category).length;
    return { total: charges.length, fromStatement, autoAssigned, uncategorized };
  }, [transactions, hasData]);

  return (
    <main className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Credit Card Points Analyzer</h1>
        {hasData && (
          <div className="flex gap-2">
            <label className="px-3 py-1.5 bg-surface border border-border text-sm rounded-md cursor-pointer hover:border-accent transition-colors">
              + Add more files
              <input
                type="file"
                accept=".csv,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    const processFiles = async () => {
                      const { parseCSV, extractPdfText, parsePdfText, getCardFromFilename } =
                        await import("@/lib/parsers");
                      let all: Transaction[] = [];
                      for (const f of Array.from(e.target.files!)) {
                        const card = getCardFromFilename(f.name);
                        if (f.name.toLowerCase().endsWith(".pdf")) {
                          const text = await extractPdfText(f);
                          all = all.concat(
                            parsePdfText(text).map((r) => ({
                              ...r,
                              card: r.card || card,
                            }))
                          );
                        } else {
                          const text = await f.text();
                          all = all.concat(
                            parseCSV(text).map((r) => ({
                              ...r,
                              card: r.card || card,
                            }))
                          );
                        }
                      }
                      handleFilesLoaded(all);
                    };
                    processFiles();
                  }
                }}
              />
            </label>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-surface border border-border text-sm rounded-md hover:border-negative transition-colors text-muted hover:text-negative"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {!hasData && <UploadZone onFilesLoaded={handleFilesLoaded} />}

      {hasData && (
        <>
          <CategoryBanner stats={categoryStats} />

          <AICategorize
            transactions={transactions}
            onUpdate={setTransactions}
          />

          <CardComparison
            transactions={transactions}
            selectedCards={selectedCards}
            onSelectedCardsChange={setSelectedCards}
            monthlyRent={monthlyRent}
            onMonthlyRentChange={setMonthlyRent}
            biltCashEnabled={biltCashEnabled}
            onBiltCashEnabledChange={setBiltCashEnabled}
          />

          <TransactionTable
            transactions={transactions}
            selectedCards={selectedCards}
          />
        </>
      )}
    </main>
  );
}
