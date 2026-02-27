import { CardKey, CardDefinition } from "./types";

export const CARDS: Record<CardKey, CardDefinition> = {
  bilt: {
    name: "Bilt Palladium",
    af: 495,
    credits: 400,
    creditDetails: ["$400 hotel credit (semiannual, $200 each half)"],
  },
  csr: {
    name: "Chase Sapphire Reserve",
    af: 795,
    credits: 1999,
    creditDetails: [
      "$300 annual travel credit",
      "$500 The Edit hotel credit ($250 semiannual)",
      "$300 DoorDash credits",
      "$300 StubHub credits",
      "$120 Lyft credit",
      "$120 DashPass membership",
      "$359 WHOOP membership",
    ],
  },
  csp: {
    name: "Chase Sapphire Preferred",
    af: 95,
    credits: 50,
    creditDetails: ["$50 annual hotel credit (Chase Travel)"],
  },
  amex: {
    name: "AMEX Platinum",
    af: 895,
    credits: 2114,
    creditDetails: [
      "$300 Lululemon credit ($75/quarter)",
      "$400 Resy dining credit ($100/quarter)",
      "$200 Uber Cash ($15/mo + $20 Dec bonus)",
      "$120 Uber One membership",
      "$240 Digital Entertainment ($20/mo)",
      "$155 Walmart+ ($12.95/mo)",
      "$100 Saks Fifth Avenue ($50/half)",
      "$200 Airline Fee credit",
      "$200 Hotel credit (FHR / Hotel Collection)",
      "$199 CLEAR Plus credit",
    ],
  },
  amexGold: {
    name: "AMEX Gold",
    af: 325,
    credits: 240,
    creditDetails: [
      "$120 Uber Cash ($10/mo)",
      "$120 dining credit ($10/mo)",
    ],
  },
  venturex: {
    name: "Capital One Venture X",
    af: 395,
    credits: 400,
    creditDetails: [
      "$300 annual travel credit (Capital One Travel)",
      "$100 anniversary miles bonus (~10,000 miles)",
    ],
  },
  deltaPlat: {
    name: "Delta SkyMiles Platinum AMEX",
    af: 350,
    credits: 390,
    creditDetails: [
      "$150 Delta Stays hotel credit",
      "$120 Resy dining credit ($10/mo)",
      "$120 Rideshare credit ($10/mo)",
      "Companion Certificate (Main Cabin domestic RT)",
      "Global Entry / TSA PreCheck fee credit",
      "First checked bag free on Delta",
    ],
  },
  deltaReserve: {
    name: "Delta SkyMiles Reserve AMEX",
    af: 650,
    credits: 560,
    creditDetails: [
      "$200 Delta Stays hotel credit",
      "$240 Resy dining credit ($20/mo)",
      "$120 Rideshare credit ($10/mo)",
      "Companion Certificate (First/Comfort+/Main Cabin domestic RT)",
      "Delta Sky Club lounge access",
      "Global Entry / TSA PreCheck fee credit",
      "First checked bag free on Delta",
    ],
  },
};
