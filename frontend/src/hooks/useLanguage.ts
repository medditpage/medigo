"use client";
import { useLanguageContext } from "@/lib/LanguageContext";

export function useLanguage() {
  return useLanguageContext();
}
