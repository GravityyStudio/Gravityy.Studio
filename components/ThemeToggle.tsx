"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/** Dark / light switch. The label names the mode it switches *to*; the icon cross-fades. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line text-fg transition-colors hover:border-fg/50 ${className}`}
    >
      <Sun size={17} aria-hidden="true" className={`absolute transition-all duration-500 ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
      <Moon size={17} aria-hidden="true" className={`absolute transition-all duration-500 ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
    </button>
  );
}
