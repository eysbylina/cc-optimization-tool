import { Transaction } from "./types";
import { lookupMerchantCategory } from "./merchantLookup";

/* ── Full-text CSV record splitter (handles multi-line quoted fields) ── */

function splitCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;

    while (i < len) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            cur += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          // Inside quotes: newlines are part of the field value — replace with space
          if (ch === "\n" || ch === "\r") {
            cur += " ";
            i++;
            if (ch === "\r" && i < len && text[i] === "\n") i++;
          } else {
            cur += ch;
            i++;
          }
        }
      } else if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(cur.trim());
        cur = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        // End of record
        fields.push(cur.trim());
        i++;
        if (ch === "\r" && i < len && text[i] === "\n") i++;
        break;
      } else {
        cur += ch;
        i++;
      }
    }

    // End of text without trailing newline
    if (i >= len && (cur || fields.length > 0)) {
      fields.push(cur.trim());
    }

    if (fields.length > 0 && fields.some((f) => f !== "")) {
      records.push(fields);
    }
  }

  return records;
}

/* ── Auto-detect column positions ────────────────────────────────────── */

interface ColumnMapping {
  date: number;
  postDate: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
  category: number;
  type: number;
  memo: number;
}

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findCol(normalized: string[], ...patterns: string[]): number {
  for (const p of patterns) {
    const idx = normalized.findIndex((h) => h === p || h.includes(p));
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectColumns(headers: string[]): ColumnMapping {
  const n = headers.map(norm);

  let dateCol = findCol(n, "transactiondate", "transdate");
  if (dateCol === -1) dateCol = findCol(n, "date");

  const postDateCol = findCol(n, "postdate", "posteddate", "postingdate");

  let descCol = findCol(n, "description", "payee", "merchant");
  if (descCol === -1) descCol = findCol(n, "name");

  const amountCol = findCol(n, "amount", "amt");
  const debitCol = findCol(n, "debit", "charge");
  const creditCol = findCol(n, "credit", "payment");
  const categoryCol = findCol(n, "category", "merchantcategory");
  const typeCol = findCol(n, "type", "transactiontype");
  const memoCol = findCol(n, "memo", "extendeddetails");

  return {
    date: dateCol,
    postDate: postDateCol,
    description: descCol,
    amount: amountCol,
    debit: debitCol,
    credit: creditCol,
    category: categoryCol,
    type: typeCol,
    memo: memoCol,
  };
}

/* ── Parse amount string ─────────────────────────────────────────────── */

function parseAmount(raw: string): number {
  if (!raw) return 0;
  const s = raw.replace(/[$,\s]/g, "");
  if (s.startsWith("(") && s.endsWith(")")) {
    return -Math.abs(parseFloat(s.slice(1, -1)) || 0);
  }
  return parseFloat(s) || 0;
}

/* ── Assign category from merchant lookup when missing ───────────────── */

function assignCategory(txn: Transaction): Transaction {
  if (txn.category) return txn;
  const looked = lookupMerchantCategory(txn.description);
  if (looked) {
    return { ...txn, category: looked, autoCategory: true };
  }
  return txn;
}

/* ── Generic CSV parser ──────────────────────────────────────────────── */

export function parseCSV(text: string): Transaction[] {
  const allRecords = splitCSVRecords(text.trim());
  if (allRecords.length < 2) return [];

  const headerFields = allRecords[0];
  const cols = detectColumns(headerFields);

  const hasDate = cols.date !== -1;
  const hasDesc = cols.description !== -1;
  const hasAmount = cols.amount !== -1;
  const hasDebitCredit = cols.debit !== -1 && cols.credit !== -1;

  if (!hasDate || !hasDesc || (!hasAmount && !hasDebitCredit)) {
    return parseChaseFallback(allRecords);
  }

  const rows: Transaction[] = [];
  for (let i = 1; i < allRecords.length; i++) {
    const parts = allRecords[i];
    if (parts.length < 2) continue;

    let amount: number;
    if (hasAmount) {
      amount = parseAmount(parts[cols.amount]);
    } else {
      const debit = parseAmount(parts[cols.debit]);
      const credit = parseAmount(parts[cols.credit]);
      amount = credit > 0 ? credit : -Math.abs(debit);
    }

    const desc = parts[cols.description] || "";
    const category = cols.category !== -1 ? parts[cols.category] || "" : "";

    const txn: Transaction = {
      transactionDate: parts[cols.date] || "",
      postDate: cols.postDate !== -1 ? parts[cols.postDate] || "" : "",
      description: desc,
      category,
      autoCategory: false,
      type: cols.type !== -1 ? parts[cols.type] || "" : "",
      amount,
      card: "",
      memo: cols.memo !== -1 ? parts[cols.memo] || "" : "",
    };

    rows.push(assignCategory(txn));
  }

  // Detect inverted sign convention (Discover, AMEX: positive = charge).
  // Count all non-zero rows — if most are positive, flip every sign.
  const nonZero = rows.filter((r) => r.amount !== 0);
  const positiveCount = nonZero.filter((r) => r.amount > 0).length;
  if (nonZero.length > 0 && positiveCount > nonZero.length * 0.6) {
    for (const r of rows) {
      r.amount = -r.amount;
    }
  }

  // Assign type based on final (possibly flipped) amount
  for (const r of rows) {
    if (!r.type) {
      r.type = r.amount >= 0 ? "Payment/Credit" : "Sale";
    }
  }

  return rows;
}

/** Chase's exact CSV format as a fallback */
function parseChaseFallback(records: string[][]): Transaction[] {
  const rows: Transaction[] = [];
  for (let i = 1; i < records.length; i++) {
    const parts = records[i];
    if (parts.length >= 6) {
      const txn: Transaction = {
        transactionDate: parts[0] || "",
        postDate: parts[1] || "",
        description: parts[2] || "",
        category: parts[3] || "",
        autoCategory: false,
        type: parts[4] || "",
        amount: parseFloat(parts[5]) || 0,
        card: "",
        memo: parts[6] || "",
      };
      rows.push(assignCategory(txn));
    }
  }
  return rows;
}

/* ── PDF parser (uses pdf.js loaded from CDN) ────────────────────────── */

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (opts: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{
              items: { str: string }[];
            }>;
          }>;
        }>;
      };
    };
  }
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return fullText;
}

const PDF_TXN_RE =
  /(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/;

export function parsePdfText(text: string): Transaction[] {
  const rows: Transaction[] = [];
  for (const line of text.split(/\n/)) {
    const m = line.match(PDF_TXN_RE);
    if (!m) continue;
    const amtStr = m[4].replace(/[$,]/g, "");
    const amount = parseFloat(amtStr) || 0;
    const txn: Transaction = {
      transactionDate: m[1],
      postDate: m[2],
      description: m[3].trim(),
      category: "",
      autoCategory: false,
      type: amount > 0 ? "Payment" : "Sale",
      amount: amount > 0 ? amount : -Math.abs(amount),
      card: "",
      memo: "",
    };
    rows.push(assignCategory(txn));
  }
  return rows;
}

/* ── Utility: extract card id from filename ──────────────────────────── */

export function getCardFromFilename(name: string): string {
  const digits = name.replace(/[^0-9]/g, "");
  return digits.slice(-4) || "card";
}
