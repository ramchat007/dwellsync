"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/types";
import { Globe, Check, ChevronDown, Loader2 } from "lucide-react";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale, supportedLocales, isChangingLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentLocaleInfo = supportedLocales.find((l) => l.code === locale) || supportedLocales[0];

  const handleSelect = async (code: Locale) => {
    setIsOpen(false);
    if (code !== locale) {
      await setLocale(code);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select Language"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
      >
        {isChangingLanguage ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        )}
        <span className="font-semibold">{currentLocaleInfo.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-100 dark:border-slate-800 py-1.5 z-50 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Choose Language / भाषा
          </div>
          {supportedLocales.map((item) => {
            const isSelected = item.code === locale;
            return (
              <button
                key={item.code}
                role="menuitem"
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{item.flag}</span>
                  <div>
                    <div className="font-medium leading-tight">{item.nativeName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

