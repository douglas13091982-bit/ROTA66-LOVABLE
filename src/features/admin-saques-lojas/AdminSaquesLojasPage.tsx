import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

type Saque = {
  id: string;
  loja_id: string;
  valor: number;
  pix_chave: string;
  status: string;
  solicitado_em: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
  observacoes_admin: string | null;
  loja_nome?: string;
};

const TABS = [
  { key: "solicitado", label: "Pendentes" },
  { key: "pago", label: "Pagos" },
  { key: "rejeitado", label: "Rejeitados" },
  { key: "todos", label: "Todos" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function AdminSaquesLojasContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("solicitado");
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-saques-lojas", tab],
    queryFn: async (): Promise<Saque[]> => {
      let q = (supabase as any)
        .from("lojas_saques")
        .select("*")
        .order("solicitado_em", { ascending: false });
      if (tab !== "todos") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Saque[];
      const lojaIds = Array.from(new Set(rows.map((r) => r.loja_id)));
      if (lojaIds.length === 0) return rows;
      const { data: lojas } = await (supabase as any).from("lojas").select("id, nome").in("id", lojaIds);
      const map = new Map((lojas ?? []).map((l: any) => [l.id, l.nome]));
      return rows.map((r) => ({ ...r, loja_nome: map.get(r.loja_id) as string | undefined }));
    },
  });

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("lojas_saques")
        .update({ status: "pago", pago_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque marcado como pago");
      qc.invalidateQueries({ queryKey: ["admin-saques-lojas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejeitar = useMutation({
    mutationFn: async (v: { id: string; motivo: string; loja_id: string; valor: number }) => {
      // devolve o saldo à carteira
      const { error: rpcErr } = await (supabase as any).rpc("aplicar_movimento_loja_saldo", {
        _loja_id: v.loja_id,
        _delta: v.valor,
        _tipo: "estorno_saque",
        _pedido_id: null,
        _descricao: `Estorno de saque rejeitado`,
      });
      if (rpcErr) throw rpcErr;
      const { error } = await (supabase as any)
        .from("lojas_saques")
        .update({ status: "rejeitado", rejeitado_em: new Date().toISOString(), motivo_rejeicao: v.motivo })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque rejeitado e saldo devolvido");
      qc.invalidateQueries({ queryKey: ["admin-saques-lojas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copiar = async (v: string, id: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
              tab === key
                ? "bg-gradient-red shadow-red text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-background"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : !data || data.length === 0 ? (
        <div className="text-muted-foreground text-sm">Nenhum saque nesta aba.</div>
      ) : (
        <div className="space-y-2">
          {data.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{s.loja_nome ?? "Loja"}</div>
                  <div className="text-xs text-muted-foreground">
                    Solicitado em {new Date(s.solicitado_em).toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">PIX:</span>
                    <code className="px-2 py-0.5 rounded bg-background border border-border text-foreground">{s.pix_chave}</code>
                    <button onClick={() => copiar(s.pix_chave, s.id)} className="text-muted-foreground hover:text-foreground">
                      {copied === s.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {s.motivo_rejeicao && (
                    <div className="text-xs text-red-500 mt-1">Motivo: {s.motivo_rejeicao}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">R$ {Number(s.valor).toFixed(2)}</div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                    s.status === "pago" ? "bg-green-600/20 text-green-500" :
                    s.status === "rejeitado" ? "bg-red-600/20 text-red-500" :
                    "bg-yellow-600/20 text-yellow-500"
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
              {s.status === "solicitado" && (
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    onClick={() => {
                      const motivo = prompt("Motivo da rejeição?");
                      if (motivo) rejeitar.mutate({ id: s.id, motivo, loja_id: s.loja_id, valor: Number(s.valor) });
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:text-foreground"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => marcarPago.mutate(s.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                  >
                    Marcar como pago
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSaquesLojasPage() {
  return (
    <AdminShell title="Saques das lojas">
      <AdminSaquesLojasContent />
    </AdminShell>
  );
}
