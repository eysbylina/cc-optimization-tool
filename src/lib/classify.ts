import { CardKey, SpendCategory, Transaction } from "./types";

const AIRLINE_RE =
  /\b(DELTA\b|UNITED\b|AMERICAN AIR|SOUTHWEST|JETBLUE|JET BLUE|ALASKA AIR|SPIRIT AIR|FRONTIER AIR|HAWAIIAN AIR|ALLEGIANT|SUN COUNTRY)/i;
const HOTEL_RE =
  /\b(MARRIOTT|HILTON|HYATT|IHG\b|HOLIDAY INN|RESIDENCE INN|COURTYARD|WESTIN\b|SHERATON|HAMPTON INN|DOUBLETREE|EMBASSY SUITE|FAIRFIELD|SPRINGHILL|W HOTEL|RITZ.CARLTON|FOUR SEASONS|ST\.?\s*REGIS|BEST WESTERN|WYNDHAM|RADISSON|OMNI\b|INTERCONTINENTAL|CROWNE PLAZA|KIMPTON|ALOFT|CANOPY|CURIO|TAPESTRY|TRIBUTE|LE MERIDIEN|ELEMENT\b|AC HOTEL|MOXY\b|PROTEA)/i;
const AIRBNB_RE = /\bAIRBNB\b/i;
const FOOD_DELIVERY_RE =
  /UBER\s*\*\s*EATS|DOORDASH|DD \*DOORDASH|GRUBHUB|POSTMATES|CAVIAR/i;
const RIDESHARE_RE = /\bLYFT\b|\bUBER\b/i;
const STREAMING_RE =
  /NETFLIX|HULU|DISNEY\+|SPOTIFY|APPLE\.COM\/BILL|YOUTUBE|HBO|PARAMOUNT|PEACOCK|ESPN|SLING/i;
const ONLINE_GROCERY_RE =
  /INSTACART|AMAZON FRESH|AMAZONFRESH|WHOLE FOODS ONLINE|SHIPT|WALMART\.COM|WALMART GROCERY|FRESHDIRECT|THRIVE MARKET|HUNGRYROOT|MISFITS MARKET|IMPERFECT FOODS/i;

export function classifyTxn(desc: string, category: string): SpendCategory {
  const d = desc || "";
  const c = (category || "").toLowerCase();
  const isFoodCat = /food|dining|drink/i.test(c);
  const isGroceryCat = /grocery|groceries/i.test(c);

  if (AIRLINE_RE.test(d)) return "airline";
  if (HOTEL_RE.test(d) && !AIRBNB_RE.test(d) && !isFoodCat && !isGroceryCat)
    return "hotel_direct";
  if (AIRBNB_RE.test(d)) return "airbnb";
  if (FOOD_DELIVERY_RE.test(d)) return "dining";
  if (RIDESHARE_RE.test(d) && !FOOD_DELIVERY_RE.test(d)) return "rideshare";
  if (STREAMING_RE.test(d)) return "streaming";
  if (isGroceryCat && ONLINE_GROCERY_RE.test(d)) return "groceries_online";
  if (isFoodCat) return "dining";
  if (isGroceryCat) return "groceries";
  if (/travel|gas/i.test(c)) return "travel_other";
  return "other";
}

export function getTxnMultiplier(cardKey: CardKey, txn: Transaction): number {
  const cls = classifyTxn(txn.description, txn.category);
  switch (cardKey) {
    case "bilt":
      return 2;
    case "csr":
      if (cls === "airline" || cls === "hotel_direct") return 4;
      if (cls === "dining") return 3;
      return 1;
    case "amex":
      if (cls === "airline") return 5;
      return 1;
    case "amexGold":
      if (cls === "dining") return 4;
      if (cls === "groceries" || cls === "groceries_online") return 4;
      if (cls === "airline") return 3;
      return 1;
    case "venturex":
      return 2;
    case "csp":
      if (cls === "dining" || cls === "streaming") return 3;
      if (cls === "groceries_online") return 3;
      if (cls === "groceries") return 1;
      if (
        cls === "airline" ||
        cls === "hotel_direct" ||
        cls === "airbnb" ||
        cls === "rideshare" ||
        cls === "travel_other"
      )
        return 2;
      return 1;
    case "deltaPlat":
      if (cls === "airline") return 3;
      if (cls === "hotel_direct") return 3;
      if (cls === "dining") return 2;
      if (cls === "groceries" || cls === "groceries_online") return 2;
      return 1;
    case "deltaReserve":
      if (cls === "airline") return 3;
      return 1;
    default:
      return 1;
  }
}

export function calcCardPoints(
  cardKey: CardKey,
  txns: Transaction[]
): number {
  let pts = 0;
  for (const txn of txns) {
    if (txn.amount < 0) {
      pts += Math.abs(txn.amount) * getTxnMultiplier(cardKey, txn);
    }
  }
  return Math.round(pts);
}

export function getPointsByCategoryForCard(
  cardKey: CardKey,
  txns: Transaction[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const txn of txns) {
    if (txn.amount >= 0) continue;
    const cat = txn.category || "Uncategorized";
    const pts = Math.abs(txn.amount) * getTxnMultiplier(cardKey, txn);
    result[cat] = (result[cat] || 0) + pts;
  }
  return result;
}

export function getSpendByCategory(
  rows: Transaction[]
): Record<string, number> {
  const byCat: Record<string, number> = {};
  for (const r of rows) {
    if (r.amount >= 0) continue;
    const cat = r.category || "Uncategorized";
    byCat[cat] = (byCat[cat] || 0) + Math.abs(r.amount);
  }
  return byCat;
}
