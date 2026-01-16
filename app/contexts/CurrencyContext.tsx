"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Currency = "USD" | "KHR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (usdPrice: number) => number;
  formatPrice: (usdPrice: number) => string;
  balance: number;
  addFunds: (amount: number) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Exchange rate: 1 USD = 4100 KHR
const USD_TO_KHR = 4100;

/* ================= PROVIDER ================= */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  // ✅ SAFE DEFAULTS (SSR)
  const [currency, setCurrency] = useState<Currency>("USD");
  const [balance, setBalance] = useState<number>(0);

  // ✅ READ localStorage ONCE (CLIENT ONLY)
  useEffect(() => {
    const savedCurrency = localStorage.getItem("edugroit-currency");
    const savedBalance = localStorage.getItem("edugroit-balance");

    if (
      (savedCurrency === "USD" || savedCurrency === "KHR") &&
      savedCurrency !== currency
    ) {
      setCurrency(savedCurrency);
    }

    if (savedBalance !== null) {
      const parsed = parseFloat(savedBalance);
      if (!Number.isNaN(parsed) && parsed !== balance) {
        setBalance(parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ SAVE currency
  useEffect(() => {
    localStorage.setItem("edugroit-currency", currency);
  }, [currency]);

  // ✅ SAVE balance
  useEffect(() => {
    localStorage.setItem("edugroit-balance", balance.toString());
  }, [balance]);

  /* ================= HELPERS ================= */
  const convertPrice = (usdPrice: number): number => {
    return currency === "KHR" ? usdPrice * USD_TO_KHR : usdPrice;
  };

  const formatPrice = (usdPrice: number): string => {
    const price = convertPrice(usdPrice);

    if (currency === "KHR") {
      return `${Math.round(price).toLocaleString()}៛`;
    }

    return `$${price.toFixed(2)}`;
  };

  const addFunds = (amount: number) => {
    // amount always in USD
    setBalance((prev) => prev + amount);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertPrice,
        formatPrice,
        balance,
        addFunds,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

/* ================= HOOK ================= */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
