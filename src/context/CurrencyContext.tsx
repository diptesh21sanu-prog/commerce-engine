import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencyInfo, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, formatMoney as formatMoneyUtil, convertCents } from '../services/currency';

interface CurrencyContextType {
  currency: string;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: string) => void;
  formatMoney: (cents: number, customRate?: number) => string;
  convertAmount: (cents: number) => number;
  availableCurrencies: CurrencyInfo[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('ce_currency') || DEFAULT_CURRENCY;
  });

  const setCurrency = (code: string) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem('ce_currency', code);
    }
  };

  const currencyInfo = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];

  const formatMoney = (cents: number, customRate?: number) => {
    return formatMoneyUtil(cents, currency, customRate);
  };

  const convertAmount = (cents: number) => {
    return convertCents(cents, currency);
  };

  const availableCurrencies = Object.values(SUPPORTED_CURRENCIES);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyInfo,
        setCurrency,
        formatMoney,
        convertAmount,
        availableCurrencies,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
