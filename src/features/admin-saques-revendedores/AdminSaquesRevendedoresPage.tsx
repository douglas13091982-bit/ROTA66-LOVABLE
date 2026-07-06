import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

type Saque = {
  id: string;
  revendedor_user_id: string;
  valor: number;
  pix_chave: string;
  status: string;
  created_at: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
  observacoes_admin: string | null;
  revendedor_nome?: string;
  revendedor_email?: string;
};

const TABS = [
  { key: "pendente", label: "Pendentes" },
  { key: "pago", label: "Pagos" },
  { key: "rejeitado", label: "Rejeitados" },
  { key: "todos", label: "Todos" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function AdminSaquesRevendedoresContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pendente");
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-saques-revendedores", tab],
    queryFn: async (): Promise<Saque[]> => {
      let q = (supabase as any)
        .from("revendedor_saques")
        .select("*")
        .order("created_at", { ascending: false });
      if (tab !== "todos") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Saque[];
      const userIds = Array.from(new Set(rows.map((r) => r.revendedor_user_id)));
      if (userIds.length === 0) return rows;
      const { data: revs } = await (supabase as any)
        .from("revendedores")
        .select("user_id, nome, email")
        .in("user_id", userIds);
      const map = new Map((revs ?? []).map((r: any) => [r.user_id, r]));
      return rows.map((r) => {
        const rv: any = map.get(r.revendedor_user_id);
        return { ...r, revendedor_nome: rv?.nome, revendedor_email: rv?.email };
      });
    },
  });

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("revendedor_saques")
        .update({ status: "pago", pago_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque marcado como pago");
      qc.invalidateQueries({ queryKey: ["admin-saques-revendedores"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejeitar = useMutation({
    mutationFn: async (v: { id: string; motivo: string }) => {
      const { error } = await (supabase as any)
        .from("revendedor_saques")
        .update({ status: "rejeitado", rejeitado_em: new Date().toISOString(), motivo_rejeicao: v.motivo })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque rejeitado");
      qc.invalidateQueries({ queryKey: ["admin-saques-revendedores"] });
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
                  <div className="font-semibold text-foreground">
                    {s.revendedor_nome ?? "Revendedor"}{" "}
                    <span className="text-muted-foreground font-normal text-xs">({s.revendedor_email})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Solicitado em {new Date(s.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">PIX:</span>
                    <code className="px-2 py-0.5 rounded bg-background border border-border text-foreground">{s.pix_chave}</code>
                    <button
                      onClick={() => copiar(s.pix_chave, s.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
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
              {s.status === "pendente" && (
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    onClick={() => {
                      const motivo = prompt("Motivo da rejeição?");
                      if (motivo) rejeitar.mutate({ id: s.id, motivo });
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

export function AdminSaquesRevendedoresPage() {
  return (
    <AdminShell title="Saques dos revendedores">
      <AdminSaquesRevendedoresContent />
    </AdminShell>
  );
}
