"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const languages = [
  { code: "tr", label: "Türkçe", flagUrl: "https://flagcdn.com/w40/tr.png" },
  { code: "en", label: "English", flagUrl: "https://flagcdn.com/w40/gb.png" },
] as const;

interface LanguageSwitcherProps {
  variant?: "settings" | "compact" | "header";
}

export function LanguageSwitcher({ variant = "settings" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find((l) => l.code === locale) ?? languages[0];

  if (variant === "settings") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-xs font-bold text-foreground">
            {t("settings.language.select")}
          </span>
          <span className="text-[10px] text-muted-foreground leading-relaxed">
            {t("settings.language.subtitle")}
          </span>
        </div>

        <div ref={ref} className="relative w-full max-w-xs">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 text-xs font-bold text-foreground transition-all duration-200",
              "hover:border-primary/40 hover:shadow-sm active:scale-[0.98] cursor-pointer"
            )}
          >
            <div className="flex items-center gap-2.5">
              <img
                src={current.flagUrl}
                className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                alt={current.label}
              />
              <span>{current.label}</span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 right-0 z-50 mt-2 bg-card border border-border backdrop-blur-md rounded-xl overflow-hidden shadow-xl"
              >
                {languages.map(({ code, label, flagUrl }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLocale(code);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-xs transition-colors duration-150 text-left cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      locale === code
                        ? "text-primary font-bold bg-primary/10"
                        : "text-foreground"
                    )}
                  >
                    <img
                      src={flagUrl}
                      className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                      alt={label}
                    />
                    <span>{label}</span>
                    {locale === code && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Compact or Header variant (for use in navbar/sidebar)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "glass flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 cursor-pointer",
          variant === "compact" ? "w-10 h-10 p-0 mx-auto" : "px-3 py-2 text-xs gap-2.5"
        )}
        title={t("settings.language.title")}
      >
        {variant === "compact" ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
            }}
          >
            <Globe className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        ) : (
          <>
            <img
              src={current.flagUrl}
              className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
              alt={current.label}
            />
            <span className="font-semibold">{current.label}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 mt-2 w-36 bg-card border border-border backdrop-blur-md rounded-xl overflow-hidden shadow-xl",
              variant === "compact" ? "bottom-full mb-2 left-0" : "right-0 top-full"
            )}
          >
            {languages.map(({ code, label, flagUrl }) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors duration-150 text-left cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  locale === code
                    ? "text-primary font-bold bg-primary/10"
                    : "text-foreground"
                )}
              >
                <img
                  src={flagUrl}
                  className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                  alt={label}
                />
                <span>{label}</span>
                {locale === code && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
