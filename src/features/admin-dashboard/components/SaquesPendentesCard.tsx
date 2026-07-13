import { Link } from "@tanstack/react-router";
import { Wallet, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSaquesPendentesCount } from "@/features/admin-saques-entregadores/hooks/use-saques-pendentes-count";

type SaqueRecente = {
  id: string;
  entregador_id: string;
  valor: number;
  pix_chave: string;
  solicitado_em: string;
  nome: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaquesPendentesCard() {
  const { data: total = 0 } = useSaquesPendentesCount();

  const { data: recentes = [] } = useQuery({
    queryKey: ["admin-saques-entregadores-recentes"],
    queryFn: async (): Promise<SaqueRecente[]> => {
      const { data: saques, error } = await (supabase as any)
        .from("entregador_saques")
        .select("id, entregador_id, valor, pix_chave, solicitado_em")
        .in("status", ["solicitado", "pendente"])
        .order("solicitado_em", { ascending: false })
        .limit(5);
      if (error) throw error;
      const ids = (saques ?? []).map((s: any) => s.entregador_id);
      let names: Record<string, string | null> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? null]));
      }
      return (saques ?? []).map((s: any) => ({
        id: s.id,
        entregador_id: s.entregador_id,
        valor: Number(s.valor ?? 0),
        pix_chave: s.pix_chave ?? "",
        solicitado_em: s.solicitado_em,
        nome: names[s.entregador_id] ?? null,
      }));
    },
    refetchInterval: 30_000,
  });

  if (total === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-amber-300">
          <Wallet className="h-5 w-5" />
          <div>
            <div className="text-sm font-bold uppercase tracking-wider">
              Saques pendentes de entregadores
            </div>
            <div className="text-xs text-amber-200/80">
              {total} solicitação{total === 1 ? "" : "ões"} aguardando aprovação
            </div>
          </div>
        </div>
        <Link
          to="/admin/carteiras"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md bg-amber-500 text-black hover:bg-amber-400"
        >
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-lg bg-background/40 border border-amber-500/20 divide-y divide-amber-500/10">
        {recentes.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="font-bold truncate">{r.nome ?? "Entregador"}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                PIX: {r.pix_chave} · {formatDate(r.solicitado_em)}
              </div>
            </div>
            <div className="font-bold text-amber-300 whitespace-nowrap">
              R$ {r.valor.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
