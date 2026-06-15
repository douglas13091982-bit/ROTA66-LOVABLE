import { CreditCard } from "lucide-react";

const MAP: Record<string, { label: string; icon: typeof CreditCard; cls: string; hint?: string }> = {
  cartao: {
    label: "Cartão na entrega",
    icon: CreditCard,
    cls: "bg-amber-500/15 border-amber-400/40 text-amber-300",
    hint: "Você precisará fazer voltar para devolver a maquininha.",
  },
  cartao_credito: {
    label: "Cartão na entrega",
    icon: CreditCard,
    cls: "bg-amber-500/15 border-amber-400/40 text-amber-300",
    hint: "Você precisará fazer voltar para devolver a maquininha.",
  },
};

export function PagamentoBadge({
  forma,
}: {
  forma?: string | null;
  troco?: number | null;
}) {
  if (!forma) return null;
  const info = MAP[forma];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className={`mb-4 rounded-xl border backdrop-blur-sm px-3 py-2.5 ${info.cls}`}>
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em]">
        <Icon className="h-4 w-4" />
        <span>{info.label}</span>
      </div>
      {info.hint && (
        <p className="text-[11px] mt-1 opacity-80 normal-case tracking-normal font-semibold">
          {info.hint}
        </p>
      )}
    </div>
  );
}
