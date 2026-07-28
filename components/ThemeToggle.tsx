"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Two-way light/dark toggle. `variant="full"` renders a labelled pill (used in
 * sidebars); `variant="icon"` renders a compact icon button (used on the
 * login / public headers).
 */
export function ThemeToggle({ variant = "full", className }: { variant?: "full" | "icon"; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        aria-label={mounted ? (isDark ? "Ativar modo claro" : "Ativar modo escuro") : "Alternar tema"}
        className={cn(
          "w-10 h-10 rounded-xl border border-line bg-surface text-dim hover:text-ink hover:bg-surface-hover flex items-center justify-center transition-all",
          className,
        )}
      >
        {mounted && !isDark ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={mounted ? (isDark ? "Ativar modo claro" : "Ativar modo escuro") : "Alternar tema"}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] text-dim hover:text-ink hover:bg-surface-hover border border-transparent transition-all",
        className,
      )}
    >
      {mounted && !isDark ? <Moon size={17} /> : <Sun size={17} />}
      <span>{mounted ? (isDark ? "Modo claro" : "Modo escuro") : "Tema"}</span>
    </button>
  );
}
