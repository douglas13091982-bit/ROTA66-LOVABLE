import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-full shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 ${isLight ? "border border-[#ef4444] bg-[#ef4444] text-white hover:bg-[#dc2626]" : "border border-border bg-card text-foreground"} ${className}`}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
