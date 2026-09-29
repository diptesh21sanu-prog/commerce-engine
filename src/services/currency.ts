export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rate: number; // relative to 1 USD
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.5, decimals: 0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0, decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92, decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 152.0, decimals: 0 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.36, decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52, decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.89, decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rate: 3.67, decimals: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.34, decimals: 2 },
};

export const DEFAULT_CURRENCY = 'USD';

/**
 * Converts base USD cents to the target currency amount
 */
export function convertCents(usdCents: number, targetCurrencyCode: string = 'USD'): number {
  const curr = SUPPORTED_CURRENCIES[targetCurrencyCode] || SUPPORTED_CURRENCIES.USD;
  const baseUsd = usdCents / 100;
  return baseUsd * curr.rate;
}

/**
 * Formats base USD cents into a localized currency string
 * e.g. 2999 cents in USD -> "$29.99"
 * e.g. 2999 cents in INR -> "₹2,504"
 * e.g. 2999 cents in JPY -> "¥4,558"
 * e.g. 2999 cents in EUR -> "€27.59"
 * e.g. 2999 cents in GBP -> "£23.69"
 */
export function formatMoney(usdCents: number, currencyCode: string = 'USD', customRate?: number): string {
  const curr = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
  const rate = customRate !== undefined ? customRate : curr.rate;
  const converted = (usdCents / 100) * rate;

  if (curr.decimals === 0) {
    const rounded = Math.round(converted);
    return `${curr.symbol}${rounded.toLocaleString('en-US')}`;
  }

  const formattedNum = converted.toLocaleString('en-US', {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals,
  });

  // For symbols like CHF or AED, provide space
  if (curr.code === 'CHF' || curr.code === 'AED') {
    return `${curr.symbol} ${formattedNum}`;
  }

  return `${curr.symbol}${formattedNum}`;
}
