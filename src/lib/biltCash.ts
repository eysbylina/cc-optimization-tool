const BILT_CASH_PCT = 0.04;
const BILT_CASH_RENT_RATE = 0.03;

export interface BiltCashBreakdown {
  biltCashEarned: number;
  biltCashNeeded: number;
  biltCashSpent: number;
  rentPtsCaptured: number;
  biltCashRemainder: number;
  shortfall: number;
  monthlySpendNeeded: number;
  rentAnnual: number;
}

export function getBiltCashBreakdown(
  totalSpend: number,
  rentMonthly: number,
  toggleOn: boolean
): BiltCashBreakdown {
  const biltCashEarned = totalSpend * BILT_CASH_PCT;
  const rentAnnual = rentMonthly * 12;
  const biltCashNeeded = rentAnnual * BILT_CASH_RENT_RATE;
  const biltCashSpent =
    toggleOn && rentMonthly > 0
      ? Math.min(biltCashEarned, biltCashNeeded)
      : 0;
  const rentPtsCaptured = Math.round(biltCashSpent / BILT_CASH_RENT_RATE);
  const biltCashRemainder = biltCashEarned - biltCashSpent;
  const shortfall =
    toggleOn && rentMonthly > 0
      ? Math.max(0, biltCashNeeded - biltCashEarned)
      : 0;
  const monthlySpendNeeded =
    (rentMonthly * BILT_CASH_RENT_RATE) / BILT_CASH_PCT;
  return {
    biltCashEarned,
    biltCashNeeded,
    biltCashSpent,
    rentPtsCaptured,
    biltCashRemainder,
    shortfall,
    monthlySpendNeeded,
    rentAnnual,
  };
}
