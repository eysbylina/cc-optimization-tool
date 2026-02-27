const BILT_CASH_PCT = 0.04;
const BILT_CASH_RENT_RATE = 0.03;
const BILT_CASH_CARRYOVER_LIMIT = 100;

export interface BiltCashBreakdown {
  biltCashEarned: number;
  biltCashNeeded: number;
  biltCashSpent: number;
  rentPtsCaptured: number;
  biltCashRemainder: number;
  shortfall: number;
  monthlySpendNeeded: number;
  rentAnnual: number;
  ecosystemSpendAnnual: number;
  biltCashAfterEcosystem: number;
  carryoverExcess: number;
}

export function getBiltCashBreakdown(
  totalSpend: number,
  rentMonthly: number,
  toggleOn: boolean,
  monthlyEcosystemSpend: number = 0
): BiltCashBreakdown {
  const biltCashEarned = totalSpend * BILT_CASH_PCT;
  const rentAnnual = rentMonthly * 12;
  const ecosystemSpendAnnual = monthlyEcosystemSpend * 12;

  // Ecosystem spend is deducted from Bilt Cash first
  const biltCashAfterEcosystem = Math.max(0, biltCashEarned - ecosystemSpendAnnual);

  const biltCashNeeded = rentAnnual * BILT_CASH_RENT_RATE;
  const biltCashSpent =
    toggleOn && rentMonthly > 0
      ? Math.min(biltCashAfterEcosystem, biltCashNeeded)
      : 0;
  const rentPtsCaptured = Math.round(biltCashSpent / BILT_CASH_RENT_RATE);
  const biltCashRemainder = biltCashAfterEcosystem - biltCashSpent;
  const shortfall =
    toggleOn && rentMonthly > 0
      ? Math.max(0, biltCashNeeded - biltCashAfterEcosystem)
      : 0;
  const monthlySpendNeeded =
    (rentMonthly * BILT_CASH_RENT_RATE + monthlyEcosystemSpend) / BILT_CASH_PCT;

  // Warn if remainder exceeds the $100/year carryover limit
  const carryoverExcess = Math.max(0, biltCashRemainder - BILT_CASH_CARRYOVER_LIMIT);

  return {
    biltCashEarned,
    biltCashNeeded,
    biltCashSpent,
    rentPtsCaptured,
    biltCashRemainder,
    shortfall,
    monthlySpendNeeded,
    rentAnnual,
    ecosystemSpendAnnual,
    biltCashAfterEcosystem,
    carryoverExcess,
  };
}
