import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptText, Loader2, Star } from "lucide-react";
import { AvaliacaoDialog } from "./AvaliacaoDialog";

interface PedidoRow {
  id: string;
  numero: number;
  status: string;
  valor_total: number | string | null;
  created_at: string;
  loja_id: string;
  itens: any;
  loja_nome?: string;
}

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  aceito: "Aceito",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  em_rota: "Em rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatBRL(v: number | string | null) {
  const n = Number(v) || 0;
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export function PedidosDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [avaliando, setAvaliando] = useState<{ lojaId: string; lojaNome: string; pedidoId: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) {
          setErro("Faça login para ver seus pedidos.");
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("pedidos")
        .select("id,numero,status,valor_total,created_at,loja_id,itens")
        .eq("cliente_user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setErro("Não foi possível carregar seus pedidos.");
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as PedidoRow[];
      const lojaIds = Array.from(new Set(rows.map((r) => r.loja_id))).filter(Boolean);
      if (lojaIds.length > 0) {
        const { data: lojas } = await supabase
          .from("lojas")
          .select("id,nome")
          .in("id", lojaIds);
        const map = new Map<string, string>();
        (lojas ?? []).forEach((l: any) => map.set(l.id, l.nome));
        rows.forEach((r) => {
          r.loja_nome = map.get(r.loja_id) ?? "Loja";
        });
      }
      setPedidos(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="catalogo-clean max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" />
            Meus pedidos
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        )}

        {!loading && erro && (
          <p className="text-sm text-muted-foreground py-6 text-center">{erro}</p>
        )}

        {!loading && !erro && pedidos.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Você ainda não fez pedidos.
          </p>
        )}

        {!loading && !erro && pedidos.length > 0 && (
          <ul className="flex flex-col gap-2 mt-2">
            {pedidos.map((p) => {
              const itens = Array.isArray(p.itens) ? p.itens : [];
              const qtd = itens.reduce(
                (s: number, it: any) => s + (Number(it?.quantidade) || 0),
                0,
              );
              return (
                <li
                  key={p.id}
                  className="border rounded-xl p-3 flex flex-col gap-1"
                  style={{ borderColor: "rgba(0,0,0,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[14px] truncate">
                      {p.loja_nome ?? "Loja"}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>#{p.numero} • {formatDate(p.created_at)}</span>
                    <span className="font-medium text-foreground">
                      {formatBRL(p.valor_total)}
                    </span>
                  </div>
                  {qtd > 0 && (
                    <div className="text-[12px] text-muted-foreground">
                      {qtd} {qtd === 1 ? "item" : "itens"}
                    </div>
                  )}
                  {p.status === "entregue" && (
                    <button
                      type="button"
                      onClick={() =>
                        setAvaliando({
                          lojaId: p.loja_id,
                          lojaNome: p.loja_nome ?? "Loja",
                          pedidoId: p.id,
                        })
                      }
                      className="mt-1 inline-flex items-center gap-1.5 self-start text-[12px] font-medium px-2.5 py-1 rounded-full border transition hover:opacity-80"
                      style={{
                        borderColor: "rgba(212,168,76,0.45)",
                        color: "var(--rota-gold)",
                        background: "rgba(212,168,76,0.10)",
                      }}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Avaliar loja
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
      {avaliando && (
        <AvaliacaoDialog
          open={!!avaliando}
          onOpenChange={(v) => !v && setAvaliando(null)}
          lojaId={avaliando.lojaId}
          lojaNome={avaliando.lojaNome}
          pedidoId={avaliando.pedidoId}
        />
      )}
    </Dialog>
  );
}
