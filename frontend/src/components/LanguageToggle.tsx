"use client";

import { useLanguage } from "@/hooks/useLanguage";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1 rounded-full transition-colors ${
          language === "en"
            ? "bg-sky-500 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        type="button"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("hi")}
        className={`px-3 py-1 rounded-full transition-colors ${
          language === "hi"
            ? "bg-sky-500 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        type="button"
      >
        हिं
      </button>
    </div>
  );
}
