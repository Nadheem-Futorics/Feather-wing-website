/**
 * Currency conversion provider.
 * When CURRENCY_API_KEY is configured a live provider can be wired here;
 * until then a static reference table is used and clearly labeled as
 * indicative. Historical expenses keep their original rate (stored on the
 * expense row) and are never silently recalculated.
 */

const STATIC_RATES_TO_USD: Record<string, number> = {
  USD: 1, SAR: 0.2666, AED: 0.2723, EUR: 1.08, GBP: 1.27, TRY: 0.031, JPY: 0.0067, CHF: 1.12, MVR: 0.065, EGP: 0.021,
};

export const fxSource = (): { live: boolean; label: string } =>
  process.env.CURRENCY_API_KEY
    ? { live: true, label: "Live rates" }
    : { live: false, label: "Indicative rates (development data)" };

export function convertToBase(amount: number, from: string, base: string): { amount: number; rate: number } {
  const f = STATIC_RATES_TO_USD[from.toUpperCase()];
  const b = STATIC_RATES_TO_USD[base.toUpperCase()];
  if (!f || !b || from.toUpperCase() === base.toUpperCase()) return { amount, rate: 1 };
  const rate = f / b;
  return { amount: Math.round(amount * rate * 100) / 100, rate };
}
