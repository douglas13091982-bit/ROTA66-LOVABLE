import { Link } from "@tanstack/react-router";
import { Store, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSaquesLojasPendentesCount } from "@/features/admin-saques-lojas/hooks/use-saques-lojas-pendentes-count";

type SaqueRecente = {
  id: string;
  loja_id: string;
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

export function SaquesLojasPendentesCard() {
  const { data: total = 0 } = useSaquesLojasPendentesCount();

  const { data: recentes = [] } = useQuery({
    queryKey: ["admin-saques-lojas-recentes"],
    queryFn: async (): Promise<SaqueRecente[]> => {
      const { data: saques, error } = await (supabase as any)
        .from("lojas_saques")
        .select("id, loja_id, valor, pix_chave, solicitado_em")
        .in("status", ["solicitado", "pendente"])
        .order("solicitado_em", { ascending: false })
        .limit(5);
      if (error) {
        console.warn("[SaquesLojasPendentesCard]", error.message ?? error);
        return [];
      }
      const ids = (saques ?? []).map((s: any) => s.loja_id);
      let names: Record<string, string | null> = {};
      if (ids.length) {
        const { data: lojas } = await (supabase as any)
          .from("lojas")
          .select("id, nome")
          .in("id", ids);
        names = Object.fromEntries((lojas ?? []).map((l: any) => [l.id, l.nome ?? null]));
      }
      return (saques ?? []).map((s: any) => ({
        id: s.id,
        loja_id: s.loja_id,
        valor: Number(s.valor ?? 0),
        pix_chave: s.pix_chave ?? "",
        solicitado_em: s.solicitado_em,
        nome: names[s.loja_id] ?? null,
      }));
    },
    refetchInterval: 30_000,
  });

  if (total === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sky-300">
          <Store className="h-5 w-5" />
          <div>
            <div className="text-sm font-bold uppercase tracking-wider">
              Saques pendentes de lojas
            </div>
            <div className="text-xs text-sky-200/80">
              {total} solicitação{total === 1 ? "" : "ões"} aguardando aprovação
            </div>
          </div>
        </div>
        <Link
          to="/admin/carteiras"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-md bg-sky-500 text-black hover:bg-sky-400"
        >
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-lg bg-background/40 border border-sky-500/20 divide-y divide-sky-500/10">
        {recentes.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className="font-bold truncate">{r.nome ?? "Loja"}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                PIX: {r.pix_chave} · {formatDate(r.solicitado_em)}
              </div>
            </div>
            <div className="font-bold text-sky-300 whitespace-nowrap">
              R$ {r.valor.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
