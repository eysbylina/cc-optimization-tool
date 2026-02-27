"use client";

import { useCallback, useState, useRef } from "react";
import { Transaction } from "@/lib/types";
import {
  parseCSV,
  extractPdfText,
  parsePdfText,
  getCardFromFilename,
} from "@/lib/parsers";

interface Props {
  onFilesLoaded: (txns: Transaction[]) => void;
}

export default function UploadZone({ onFilesLoaded }: Props) {
  const [dragover, setDragover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setLoading(true);
      setError(null);

      try {
        let all: Transaction[] = [];

        for (const f of Array.from(files)) {
          const card = getCardFromFilename(f.name);

          if (f.name.toLowerCase().endsWith(".pdf")) {
            const pdfText = await extractPdfText(f);
            const rows = parsePdfText(pdfText).map((r) => ({
              ...r,
              card: r.card || card,
            }));
            all = all.concat(rows);
          } else {
            const text = await f.text();
            const rows = parseCSV(text).map((r) => ({
              ...r,
              card: r.card || card,
            }));
            all = all.concat(rows);
          }
        }

        if (all.length === 0) {
          setError(
            "No transactions found. Make sure you're uploading a credit card statement CSV or PDF."
          );
          setLoading(false);
          return;
        }

        all.sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime()
        );

        onFilesLoaded(all);
      } catch (e) {
        setError(
          `Error parsing file: ${e instanceof Error ? e.message : "Unknown error"}. Try exporting as CSV from your bank.`
        );
      }
      setLoading(false);
    },
    [onFilesLoaded]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors bg-surface ${
        dragover ? "border-accent" : "border-border hover:border-accent"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragover(false);
        processFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.pdf"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />

      <p className="text-lg font-semibold mb-2">
        Drop your credit card statements here
      </p>
      <p className="text-muted max-w-lg mx-auto mb-3 text-sm">
        This tool analyzes your actual spending history and projects how many
        points you would earn if that same spend were on a different credit
        card — helping you find the best card for your lifestyle.
      </p>
      <p className="text-muted text-xs mb-3">
        Works with statements from any bank — Chase, AMEX, Capital One, Citi,
        and more. Accepted formats: CSV or PDF.
      </p>

      {loading && (
        <p className="text-accent text-sm mt-3 animate-pulse">
          Processing files…
        </p>
      )}
      {error && <p className="text-negative text-sm mt-3">{error}</p>}

      <div className="mt-5 mx-auto max-w-lg text-left p-3 rounded-md border border-positive/30 bg-positive/5">
        <p className="text-sm font-semibold text-positive mb-1">
          &#128274; Your data stays 100% private
        </p>
        <ul className="text-xs text-muted space-y-0.5 list-disc pl-5">
          <li>
            Everything runs locally in your browser — no data is ever uploaded
          </li>
          <li>
            Statements are processed in memory only — nothing saved to disk
          </li>
          <li>All data is erased when you close or refresh the page</li>
          <li>You can verify this: the page works fully offline after loading</li>
        </ul>
      </div>
    </div>
  );
}
