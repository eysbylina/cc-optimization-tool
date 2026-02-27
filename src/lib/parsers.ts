import { Transaction, CardKey } from "./types";
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
        fields.push(cur.trim());
        i++;
        if (ch === "\r" && i < len && text[i] === "\n") i++;
        break;
      } else {
        cur += ch;
        i++;
      }
    }

    if (i >= len && (cur || fields.length > 0)) {
      fields.push(cur.trim());
    }

    if (fields.length > 0 && fields.some((f) => f !== "")) {
      records.push(fields);
    }
  }

  return records;
}

/* ── Find the real header row (skip metadata lines) ──────────────────── */

const HEADER_WORDS =
  /^(date|trans|post|description|desc|payee|merchant|name|amount|amt|debit|credit|charge|payment|category|type|memo|card|status|ref)/i;

function isHeaderRow(record: string[]): boolean {
  const matches = record.filter((f) => HEADER_WORDS.test(f.trim()));
  return matches.length >= 2;
}

function findHeaderIndex(records: string[][]): number {
  for (let i = 0; i < Math.min(records.length, 10); i++) {
    if (isHeaderRow(records[i])) return i;
  }
  return 0;
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
  card: number;
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
  const cardCol = findCol(n, "card", "cardno", "cardnumber", "accountnumber");

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
    card: cardCol,
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

/* ── Extract card id from a "Card" column value like "Card-0634" ─────── */

function parseCardColumn(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits.slice(-4) || "";
}

/* ── Generic CSV parser ──────────────────────────────────────────────── */

export function parseCSV(text: string): Transaction[] {
  const allRecords = splitCSVRecords(text.trim());
  if (allRecords.length < 2) return [];

  const headerIdx = findHeaderIndex(allRecords);
  const headerFields = allRecords[headerIdx];
  const cols = detectColumns(headerFields);

  const hasDate = cols.date !== -1;
  const hasDesc = cols.description !== -1;
  const hasAmount = cols.amount !== -1;
  const hasDebitCredit = cols.debit !== -1 && cols.credit !== -1;

  if (!hasDate || !hasDesc || (!hasAmount && !hasDebitCredit)) {
    return parseChaseFallback(allRecords);
  }

  const rows: Transaction[] = [];
  for (let i = headerIdx + 1; i < allRecords.length; i++) {
    const parts = allRecords[i];
    if (parts.length < 2) continue;

    let amount: number;
    if (hasAmount) {
      amount = parseAmount(parts[cols.amount]);
    } else {
      const debit = parseAmount(parts[cols.debit]);
      const credit = parseAmount(parts[cols.credit]);
      // Debit column = charge → make negative; Credit column = refund → make positive.
      // Use Math.abs because some banks (Citi) put negative values in the credit column.
      if (debit) {
        amount = -Math.abs(debit);
      } else if (credit) {
        amount = Math.abs(credit);
      } else {
        amount = 0;
      }
    }

    const desc = parts[cols.description] || "";
    const category = cols.category !== -1 ? parts[cols.category] || "" : "";
    const cardFromCol =
      cols.card !== -1 ? parseCardColumn(parts[cols.card] || "") : "";

    const txn: Transaction = {
      transactionDate: parts[cols.date] || "",
      postDate: cols.postDate !== -1 ? parts[cols.postDate] || "" : "",
      description: desc,
      category,
      autoCategory: false,
      type: cols.type !== -1 ? parts[cols.type] || "" : "",
      amount,
      card: cardFromCol,
      memo: cols.memo !== -1 ? parts[cols.memo] || "" : "",
    };

    rows.push(assignCategory(txn));
  }

  // Detect inverted sign convention (Discover, AMEX: positive = charge).
  // Only applies when using a single "amount" column — skip for debit/credit format
  // since we already normalized signs above.
  if (hasAmount) {
    const nonZero = rows.filter((r) => r.amount !== 0);
    const positiveCount = nonZero.filter((r) => r.amount > 0).length;
    if (nonZero.length > 0 && positiveCount > nonZero.length * 0.6) {
      for (const r of rows) {
        r.amount = -r.amount;
      }
    }
  }

  // Assign type based on final amount
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

interface PdfTextItem {
  str: string;
  transform?: number[];
}

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (opts: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{
              items: PdfTextItem[];
            }>;
          }>;
        }>;
      };
    };
  }
}

/**
 * Extract text from PDF with proper line detection.
 * Groups text items by Y-position so each visual line in the PDF
 * becomes a separate line in the output string.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group text items by Y-position to reconstruct visual lines
    const lineMap = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!item.transform) continue;
      // Round Y to nearest 2 to group items on the same visual line
      const y = Math.round(item.transform[5] / 2) * 2;
      const x = item.transform[4];
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, str: item.str });
    }

    // Sort lines top-to-bottom (descending Y in PDF coords), items left-to-right
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const text = items.map((i) => i.str).join(" ").trim();
      if (text) allLines.push(text);
    }
  }

  return allLines.join("\n");
}

/* ── PDF transaction patterns (multiple bank formats) ────────────────── */

// Chase year-end: MM/DD  MM/DD  description  amount (two dates)
const CHASE_PDF_RE =
  /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/;

// Chase monthly: MM/DD  description  amount (single date, no year)
const CHASE_MONTHLY_PDF_RE =
  /^(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/;

// AMEX year-end: MM/DD/YYYY  MonthName  description  $amount
const MONTHS_RE =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const AMEX_PDF_RE = new RegExp(
  `^(\\d{2}\\/\\d{2}\\/\\d{4})\\s+${MONTHS_RE}\\s+(.+?)\\s+-?\\$?([\\d,]+\\.\\d{2})$`
);

// Generic: MM/DD/YYYY  description  $amount  (or MM/DD/YY)
const GENERIC_PDF_RE =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+-?\$?([\d,]+\.\d{2})$/;

// Credit detection: lines whose description suggests a refund/credit
const CREDIT_DESC_RE =
  /\bCREDIT\b|\bREFUND\b|\bRETURN(?:ED)?\b|\bCASHBACK\b|\bREWARD\b|\bCB_|\bREBATH?E\b/i;

// Category section headers common in year-end PDF summaries
const PDF_CATEGORY_MAP: [RegExp, string][] = [
  [/\bAirline\b/i, "Travel"],
  [/\bTravel\b/i, "Travel"],
  [/\bTransportation\b/i, "Travel"],
  [/\bTaxi/i, "Travel"],
  [/\bRideshare\b/i, "Travel"],
  [/\bGrocery|Groceries|Supermarket/i, "Groceries"],
  [/\bDining\b|\bRestaurant/i, "Food & Drink"],
  [/\bEntertainment\b/i, "Entertainment"],
  [/\bCommunication/i, "Entertainment"],
  [/\bCable\b.*Internet|Internet\b.*Cable/i, "Entertainment"],
  [/\bStreaming\b/i, "Entertainment"],
  [/\bMerchandise\b|\bShopping\b/i, "Shopping"],
  [/\bGas\b|\bFuel\b|\bVehicle\b|\bAutomotive\b/i, "Gas"],
  [/\bMedical\b|\bHealth\b|\bPharmacy\b/i, "Health & Wellness"],
  [/\bUtiliti/i, "Bills & Utilities"],
  [/\bInsurance\b/i, "Bills & Utilities"],
  [/\bEducation\b/i, "Education"],
];

function matchPdfCategory(line: string): string | null {
  for (const [re, cat] of PDF_CATEGORY_MAP) {
    if (re.test(line)) return cat;
  }
  return null;
}

// Lines to skip (headers, subtotals, metadata)
const SKIP_LINE_RE =
  /^(Subtotal|Total|Card Member|Account Number|Date\s+Month|Page\s+\d|Prepared for|Includes charges|Year-End|Account Summary|Combined Spending|Details of Spending|--\s*\d)/i;

export function parsePdfText(text: string): Transaction[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l);
  const rows: Transaction[] = [];
  let currentCategory = "";

  for (const line of lines) {
    if (SKIP_LINE_RE.test(line)) continue;

    // Check if line is a category section header
    const cat = matchPdfCategory(line);
    if (cat && !/^\d/.test(line)) {
      currentCategory = cat;
      continue;
    }

    // Try Chase year-end format (two dates: trans date + post date)
    let m = line.match(CHASE_PDF_RE);
    if (m) {
      const amtStr = m[4].replace(/[$,]/g, "");
      const raw = parseFloat(amtStr) || 0;
      const isCredit = raw > 0;
      rows.push(
        assignCategory({
          transactionDate: m[1],
          postDate: m[2],
          description: m[3].trim(),
          category: currentCategory,
          autoCategory: !!currentCategory,
          type: isCredit ? "Payment/Credit" : "Sale",
          amount: isCredit ? raw : -Math.abs(raw),
          card: "",
          memo: "",
        })
      );
      continue;
    }

    // Try Chase monthly format (single date MM/DD, no year)
    // Sign convention: positive = purchase (charge), negative = payment/credit
    m = line.match(CHASE_MONTHLY_PDF_RE);
    if (m) {
      const amtStr = m[3].replace(/[$,]/g, "");
      const raw = parseFloat(amtStr) || 0;
      const isCredit = raw < 0;
      rows.push(
        assignCategory({
          transactionDate: m[1],
          postDate: "",
          description: m[2].trim(),
          category: currentCategory,
          autoCategory: !!currentCategory,
          type: isCredit ? "Payment/Credit" : "Sale",
          amount: -raw,
          card: "",
          memo: "",
        })
      );
      continue;
    }

    // Try AMEX year-end format
    m = line.match(AMEX_PDF_RE);
    if (m) {
      const amtStr = m[3].replace(/[$,]/g, "");
      const raw = parseFloat(amtStr) || 0;
      const desc = m[2].trim();
      const isCredit = CREDIT_DESC_RE.test(desc) || line.includes("-$");
      rows.push(
        assignCategory({
          transactionDate: m[1],
          postDate: "",
          description: desc,
          category: currentCategory,
          autoCategory: !!currentCategory,
          type: isCredit ? "Payment/Credit" : "Sale",
          amount: isCredit ? raw : -Math.abs(raw),
          card: "",
          memo: "",
        })
      );
      continue;
    }

    // Try generic date format
    m = line.match(GENERIC_PDF_RE);
    if (m) {
      const amtStr = m[3].replace(/[$,]/g, "");
      const raw = parseFloat(amtStr) || 0;
      const desc = m[2].trim();
      const isCredit = CREDIT_DESC_RE.test(desc) || line.includes("-$");
      rows.push(
        assignCategory({
          transactionDate: m[1],
          postDate: "",
          description: desc,
          category: currentCategory,
          autoCategory: !!currentCategory,
          type: isCredit ? "Payment/Credit" : "Sale",
          amount: isCredit ? raw : -Math.abs(raw),
          card: "",
          memo: "",
        })
      );
      continue;
    }
  }

  return rows;
}

/* ── Utility: extract card id from filename ──────────────────────────── */

export function getCardFromFilename(name: string): string {
  const digits = name.replace(/[^0-9]/g, "");
  return digits.slice(-4) || "card";
}

/* ── Detect card product from file content / filename ────────────────── */

const CARD_PRODUCT_PATTERNS: [RegExp, CardKey, string][] = [
  [/FREEDOM\s+UNLIMITED/i, "cfu", "Chase Freedom Unlimited"],
  [/SAPPHIRE\s+RESERVE/i, "csr", "Chase Sapphire Reserve"],
  [/SAPPHIRE\s+PREFERRED/i, "csp", "Chase Sapphire Preferred"],
  [/DELTA.*RESERVE/i, "deltaReserve", "Delta SkyMiles Reserve AMEX"],
  [/DELTA.*PLATINUM/i, "deltaPlat", "Delta SkyMiles Platinum AMEX"],
  [/PLATINUM\s+CARD.*AMERICAN\s+EXPRESS/i, "amex", "AMEX Platinum"],
  [/AMERICAN\s+EXPRESS.*PLATINUM/i, "amex", "AMEX Platinum"],
  [/AMEX\s+PLATINUM/i, "amex", "AMEX Platinum"],
  [/GOLD\s+CARD.*AMERICAN\s+EXPRESS/i, "amexGold", "AMEX Gold"],
  [/AMERICAN\s+EXPRESS.*GOLD/i, "amexGold", "AMEX Gold"],
  [/AMEX\s+GOLD/i, "amexGold", "AMEX Gold"],
  [/VENTURE\s*X/i, "venturex", "Capital One Venture X"],
  [/BILT/i, "bilt", "Bilt Palladium"],
];

export interface DetectedCard {
  cardKey: CardKey | null;
  productName: string | null;
}

export function detectCardProduct(
  text: string,
  filename: string
): DetectedCard {
  const combined = filename + "\n" + text.slice(0, 3000);
  for (const [re, key, name] of CARD_PRODUCT_PATTERNS) {
    if (re.test(combined)) return { cardKey: key, productName: name };
  }
  return { cardKey: null, productName: null };
}
