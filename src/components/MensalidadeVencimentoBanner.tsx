import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMinhaLoja, useIsLojaOwner } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyValue } from "@/lib/format";

function calcularProxVencimento(diaVenc: number): string | undefined {
  if (!diaVenc || diaVenc < 1 || diaVenc > 31) return undefined;
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  const diaHoje = hoje.getDate();
  const alvo = new Date(y, diaHoje <= diaVenc ? m : m + 1, diaVenc);
  const yyyy = alvo.getFullYear();
  const mm = String(alvo.getMonth() + 1).padStart(2, "0");
  const dd = String(alvo.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export function MensalidadeVencimentoBanner() {
  const { data: loja } = useMinhaLoja();
  const isOwner = useIsLojaOwner(loja);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const { data: mensAberta } = useQuery({
    queryKey: ["mensalidade-proxima", loja?.id],
    enabled: !!loja?.id && isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("mensalidades_loja")
        .select("id, vencimento, valor, pago")
        .eq("loja_id", loja!.id)
        .eq("pago", false)
        .order("vencimento", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const diaVenc = Number((loja as any)?.dia_vencimento_mensalidade ?? 0);
  const vencimento = mensAberta?.vencimento ?? calcularProxVencimento(diaVenc);
  const dias = vencimento ? diffDays(vencimento) : null;

  const storageKey = useMemo(
    () => (loja && vencimento ? `mens-venc-dismiss:${loja.id}:${vencimento}` : null),
    [loja, vencimento],
  );

  useEffect(() => {
    if (!storageKey) return;
    setDismissed(typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null);
  }, [storageKey]);

  if (!isOwner || !vencimento || dias === null) return null;
  // Show at 7, 3, 1 days before or on the due date (or slightly overdue up to 3 days)
  if (dias > 7 || dias < -3) return null;
  if (dismissed === "1") return null;

  const overdue = dias < 0;
  const critical = dias <= 1;
  const tone = overdue
    ? "bg-red-500/15 border-red-500/40 text-red-100"
    : critical
      ? "bg-red-500/12 border-red-500/35 text-red-100"
      : "bg-amber-500/12 border-amber-500/35 text-amber-100";
  const Icon = overdue || critical ? AlertTriangle : CalendarClock;

  const [y, m, d] = vencimento.split("-");
  const dataFmt = `${d}/${m}/${y}`;
  const titulo = overdue
    ? `Mensalidade vencida há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`
    : dias === 0
      ? "Mensalidade vence hoje"
      : dias === 1
        ? "Mensalidade vence amanhã"
        : `Mensalidade vence em ${dias} dias`;

  const handleDismiss = () => {
    if (storageKey) window.localStorage.setItem(storageKey, "1");
    setDismissed("1");
  };

  return (
    <div className={`sticky top-0 z-30 flex items-center gap-3 px-5 md:px-8 py-2.5 border-b ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0 text-xs">
        <span className="font-semibold">{titulo}.</span>{" "}
        <span className="opacity-90">
          Vencimento {dataFmt}
          {mensAberta?.valor ? ` — R$ ${formatCurrencyValue(Number(mensAberta.valor))}` : ""}
          . Evite bloqueio pagando antes do vencimento.
        </span>
      </div>
      <Link
        to="/loja/financeiro"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 border border-white/25 font-semibold uppercase tracking-wider text-[10px] transition"
      >
        Ver financeiro
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 h-6 w-6 grid place-items-center rounded-md hover:bg-white/10 transition"
        aria-label="Dispensar aviso"
        title="Dispensar até o próximo vencimento"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
