"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LOCAL_PROGRESS_CHANGE_EVENT } from "@/lib/cloud-progress";
import {
  DEFAULT_LOCALE,
  getHtmlLang,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const readStoredLocale = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(value) ? value : DEFAULT_LOCALE;
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    document.documentElement.lang = getHtmlLang(locale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  useEffect(() => {
    const syncLocale = () => {
      setLocaleState(readStoredLocale());
    };

    window.addEventListener("storage", syncLocale);
    window.addEventListener(LOCAL_PROGRESS_CHANGE_EVENT, syncLocale);
    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener(LOCAL_PROGRESS_CHANGE_EVENT, syncLocale);
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    document.documentElement.lang = getHtmlLang(nextLocale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(LOCAL_PROGRESS_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
    };
  }
  return context;
};
