/**
 * Pakistan-first pricing. Catalog prices stay in USD (that is how costs are measured); customers see rupees.
 * Set NEXT_PUBLIC_USD_TO_PKR in .env (build-time, so server and browser agree) and rebuild when the rate moves.
 */
export const PKR_PER_USD = Number(process.env.NEXT_PUBLIC_USD_TO_PKR) > 0 ? Number(process.env.NEXT_PUBLIC_USD_TO_PKR) : 280;

/** Rounded up to the next Rs. 10, never below Rs. 30 (very small amounts are not worth a gateway fee). */
export function pkrFor(usd: number): number {
  return Math.max(30, Math.ceil((usd * PKR_PER_USD) / 10) * 10);
}

/** 1250 -> "Rs. 1,250". Manual grouping so server and browser always print the same text. */
export function formatPkr(pkr: number): string {
  return `Rs. ${Math.round(pkr).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
