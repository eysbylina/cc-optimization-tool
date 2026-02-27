export interface Transaction {
  transactionDate: string;
  postDate: string;
  description: string;
  category: string;
  autoCategory: boolean;
  type: string;
  amount: number;
  card: string;
  memo: string;
}

export type SpendCategory =
  | "airline"
  | "hotel_direct"
  | "airbnb"
  | "dining"
  | "rideshare"
  | "streaming"
  | "groceries_online"
  | "groceries"
  | "travel_other"
  | "other";

export type CardKey =
  | "bilt"
  | "csr"
  | "csp"
  | "amex"
  | "amexGold"
  | "venturex"
  | "deltaPlat"
  | "deltaReserve";

export interface CardDefinition {
  name: string;
  af: number;
  credits: number;
  creditDetails: string[];
}

export const CARD_KEYS: CardKey[] = [
  "csr",
  "bilt",
  "csp",
  "amex",
  "amexGold",
  "venturex",
  "deltaPlat",
  "deltaReserve",
];
