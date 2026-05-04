import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEY, translate } from "../i18n/translate.js";

const LanguageContext = createContext(null);

function normalizeLocale(v) {
  return v === "am" ? "am" : "en";
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return normalizeLocale(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "en";
    }
  });

  const setLocale = useCallback((lng) => {
    const next = normalizeLocale(lng);
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "am" ? "am" : "en";
  }, [locale]);

  const t = useCallback((key) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
