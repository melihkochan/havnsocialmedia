"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const themes = [
  { value: "light", label: "Açık Mod", icon: Sun },
  { value: "dark", label: "Koyu Mod", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

interface ThemeToggleProps {
  variant?: "sidebar" | "compact" | "half";
  onExpand?: () => void;
}

export function ThemeToggle({ variant = "sidebar", onExpand }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return null;

  const current = themes.find((t) => t.value === theme) ?? themes[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (variant === "compact" && onExpand) {
            onExpand();
            setOpen(true);
          } else {
            setOpen((o) => !o);
          }
        }}
        title={variant === "compact" ? "Tema Değiştir" : undefined}
        className={cn(
          "glass flex items-center transition-all duration-200",
          "hover:border-primary/40 hover:shadow-sm active:scale-95",
          variant === "sidebar"
            ? "w-full px-3 py-2.5 text-sm font-medium text-foreground gap-2.5"
            : variant === "half"
            ? "w-full px-3 py-2.5 text-sm font-medium text-foreground justify-center gap-2.5"
            : variant === "compact"
            ? "w-10 h-10 justify-center p-0 mx-auto"
            : "px-3 py-2 text-sm gap-2.5"
        )}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
          }}
        >
          <CurrentIcon className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        {(variant === "sidebar" || variant === "half") && (
          <>
            <span className="flex-1 text-left text-xs font-semibold truncate">
              {variant === "half"
                ? (theme === "light" ? "Açık" : theme === "dark" ? "Koyu" : "Sistem")
                : current.label}
            </span>
            {variant === "sidebar" && (
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            )}
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
              "absolute z-50 mt-2 w-44 bg-card border border-border backdrop-blur-md rounded-xl overflow-hidden shadow-xl",
              variant === "compact"
                ? "bottom-0 left-full ml-3 mb-0"
                : (variant === "sidebar" || variant === "half")
                ? "bottom-full mb-2 left-0"
                : "right-0 top-full"
            )}
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  theme === value
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {theme === value && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
