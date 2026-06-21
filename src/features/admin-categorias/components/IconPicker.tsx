import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  CATEGORIA_ICON_NAMES,
  getCategoriaIcon,
  type CategoriaIconName,
} from "@/lib/categoria-icons";

type Props = {
  value: string | null;
  onChange: (v: string | null) => void;
};

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const Current = getCategoriaIcon(value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-full flex items-center gap-2 bg-black/30 border border-white/10 rounded-md px-3 text-sm text-white hover:border-white/30"
      >
        {Current ? (
          <Current className="h-4 w-4 text-[var(--rota-gold)]" />
        ) : (
          <span className="text-white/40 text-xs">sem ícone</span>
        )}
        <span className="text-white/70 text-xs truncate">{value || "Escolher ícone"}</span>
        {value && (
          <span
            role="button"
            aria-label="Remover ícone"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-auto h-5 w-5 grid place-items-center rounded hover:bg-white/10 text-white/60"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-[280px] max-h-[260px] overflow-y-auto p-2 grid grid-cols-6 gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl">
            {CATEGORIA_ICON_NAMES.map((name: CategoriaIconName) => {
              const Icon = getCategoriaIcon(name)!;
              const active = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={`h-9 w-9 grid place-items-center rounded-md border ${
                    active
                      ? "border-[var(--rota-gold)] bg-[var(--rota-gold)]/15 text-[var(--rota-gold)]"
                      : "border-transparent text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {active && <Check className="h-2 w-2 absolute" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
