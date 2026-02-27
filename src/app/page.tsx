"use client";

import { useState, useCallback, useMemo } from "react";
import { Transaction, CardKey } from "@/lib/types";
import { CARDS } from "@/lib/cards";
import UploadZone, { UploadResult } from "@/components/UploadZone";
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
  const [monthlyBiltEcosystemSpend, setMonthlyBiltEcosystemSpend] =
    useState(0);
  const [cardDetectionMsg, setCardDetectionMsg] = useState<string | null>(null);

  const handleFilesLoaded = useCallback(
    (result: UploadResult) => {
      setTransactions((prev) => {
        const all = [...prev, ...result.transactions];
        all.sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime()
        );
        return all;
      });

      // Auto-detect card product and set Current Card
      const detected = result.detectedCards.find((d) => d.cardKey !== null);
      if (detected?.cardKey) {
        setSelectedCards((prev) => [detected.cardKey!, prev[1], prev[2]]);
        setCardDetectionMsg(
          `Detected "${CARDS[detected.cardKey].name}" from your statement — set as Current Card.`
        );
      } else if (result.detectedCards.length > 0) {
        setCardDetectionMsg(
          "Could not identify the card product from your statement. Please select your current card manually."
        );
      }
    },
    []
  );

  const handleAddMoreFiles = useCallback(
    async (fileList: FileList) => {
      const {
        parseCSV,
        extractPdfText,
        parsePdfText,
        getCardFromFilename,
        detectCardProduct,
      } = await import("@/lib/parsers");
      let all: Transaction[] = [];
      const detectedCards: { cardKey: CardKey | null; productName: string | null }[] = [];

      for (const f of Array.from(fileList)) {
        const card = getCardFromFilename(f.name);
        if (f.name.toLowerCase().endsWith(".pdf")) {
          const text = await extractPdfText(f);
          detectedCards.push(detectCardProduct(text, f.name));
          all = all.concat(
            parsePdfText(text).map((r) => ({ ...r, card: r.card || card }))
          );
        } else {
          const text = await f.text();
          detectedCards.push(detectCardProduct(text, f.name));
          all = all.concat(
            parseCSV(text).map((r) => ({ ...r, card: r.card || card }))
          );
        }
      }

      handleFilesLoaded({ transactions: all, detectedCards });
    },
    [handleFilesLoaded]
  );

  const handleReset = useCallback(() => {
    setTransactions([]);
    setCardDetectionMsg(null);
  }, []);

  const hasData = transactions.length > 0;

  const categoryStats = useMemo(() => {
    if (!hasData)
      return { total: 0, fromStatement: 0, autoAssigned: 0, uncategorized: 0 };
    const charges = transactions.filter((t) => t.amount < 0);
    const fromStatement = charges.filter(
      (t) => t.category && !t.autoCategory
    ).length;
    const autoAssigned = charges.filter((t) => t.autoCategory).length;
    const uncategorized = charges.filter((t) => !t.category).length;
    return {
      total: charges.length,
      fromStatement,
      autoAssigned,
      uncategorized,
    };
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
                  if (e.target.files) handleAddMoreFiles(e.target.files);
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
          {/* Card detection message */}
          {cardDetectionMsg && (
            <div
              className={`mb-4 px-4 py-2.5 rounded-md border text-sm flex items-center justify-between ${
                cardDetectionMsg.includes("Detected")
                  ? "border-positive/40 bg-positive/5 text-positive"
                  : "border-yellow-500/40 bg-yellow-500/5 text-yellow-400"
              }`}
            >
              <span>{cardDetectionMsg}</span>
              <button
                onClick={() => setCardDetectionMsg(null)}
                className="ml-3 text-xs opacity-60 hover:opacity-100"
              >
                dismiss
              </button>
            </div>
          )}

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
            monthlyBiltEcosystemSpend={monthlyBiltEcosystemSpend}
            onMonthlyBiltEcosystemSpendChange={setMonthlyBiltEcosystemSpend}
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
