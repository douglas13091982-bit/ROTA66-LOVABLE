import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      title={isLight ? "Tema escuro" : "Tema claro"}
      className={`h-9 w-9 grid place-items-center rounded-lg border transition
        ${isLight
          ? "border-[#0f304d]/15 bg-white text-[#0f304d] hover:bg-[#0f304d]/5"
          : "border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08]"
        } ${className}`}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
