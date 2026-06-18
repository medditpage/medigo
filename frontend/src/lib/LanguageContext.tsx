"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getTranslations, Language } from "@/lib/translations";
import api from "@/lib/api";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language, persist?: boolean) => Promise<void>;
  t: ReturnType<typeof getTranslations>;
  loaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("medigo_language");
    if (stored === "en" || stored === "hi") {
      setLanguageState(stored);
    }
    setLoaded(true);
  }, []);

  const setLanguage = useCallback(async (lang: Language, persist = true) => {
    setLanguageState(lang);
    localStorage.setItem("medigo_language", lang);
    if (persist) {
      try {
        await api.patch("/auth/language", { language: lang });
      } catch {}
    }
  }, []);

  const t = getTranslations(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguageContext must be used inside LanguageProvider");
  return ctx;
}
