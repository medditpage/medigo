"use client";

import { useState, useEffect, useCallback } from "react";
import { getTranslations, Language } from "@/lib/translations";
import api from "@/lib/api";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("medigo_language")
        : null;
    if (stored === "en" || stored === "hi") {
      setLanguageState(stored);
    }
    setLoaded(true);
  }, []);

  const setLanguage = useCallback(async (lang: Language, persist = true) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("medigo_language", lang);
    }
    if (persist) {
      try {
        await api.patch("/auth/language", { language: lang });
      } catch {}
    }
  }, []);

  const t = getTranslations(language);

  return { language, setLanguage, t, loaded };
}
