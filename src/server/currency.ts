export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rate: number;
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

export function getCurrency(code: string = 'USD'): CurrencyInfo {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
}
