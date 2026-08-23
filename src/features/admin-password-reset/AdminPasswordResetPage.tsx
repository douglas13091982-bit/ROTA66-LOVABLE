import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, RefreshCw, Link2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { formatDateTime } from "@/lib/format";

type ResetRow = {
  id: string;
  email: string;
  user_id: string | null;
  status: string;
  token: string | null;
  token_expires_at: string | null;
  observacao: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function AdminPasswordResetPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pendente" | "historico" | "todos">("pendente");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-password-reset", filter],
    queryFn: async () => {
      let q = supabase
        .from("password_reset_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pendente") q = q.eq("status", "pendente");
      if (filter === "historico") q = q.neq("status", "pendente");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ResetRow[];
    },
    refetchInterval: 30_000,
  });

  // Telefones (para envio via WhatsApp)
  const userIds = Array.from(new Set(data.map((r) => r.user_id).filter(Boolean))) as string[];
  const { data: telefones = {} } = useQuery({
    queryKey: ["admin-password-reset-phones", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone, full_name")
        .in("id", userIds);
      if (error) throw error;
      const map: Record<string, { phone: string | null; full_name: string | null }> = {};
      (data ?? []).forEach((p: any) => {
        map[p.id] = { phone: p.phone ?? null, full_name: p.full_name ?? null };
      });
      return map;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-password-reset"] });


  async function rejeitar(id: string) {
    const motivo = prompt("Motivo da rejeição (opcional):") ?? null;
    const { error } = await supabase.rpc("rejeitar_reset_senha" as any, {
      _request_id: id,
      _motivo: motivo,
    });
    if (error) return toast.error(error.message);
    toast.success("Pedido rejeitado.");
    invalidate();
  }

  function copiarLink(token: string) {
    navigator.clipboard.writeText(montarLink(token)).catch(() => {});
    toast.success("Link copiado!");
  }

  async function enviarWhatsApp(r: ResetRow) {
    const info = r.user_id ? telefones[r.user_id] : undefined;
    const nome = info?.full_name?.split(" ")[0] ?? "";

    // Garante que sempre exista um link: se ainda não foi aprovado, aprova agora
    let token = r.token;
    if (!token) {
      const { data, error } = await supabase.rpc("aprovar_reset_senha" as any, {
        _request_id: r.id,
      });
      const res = data as any;
      if (error || !res?.ok) {
        toast.error(error?.message ?? res?.message ?? "Falha ao gerar o link.");
        return;
      }
      token = res.token as string;
      invalidate();
    }

    const texto =
      `Olá${nome ? " " + nome : ""}! Recebemos seu pedido de redefinição de senha no ROTA 66.\n\n` +
      `Abra o link abaixo e cadastre sua nova senha (válido por 24 horas):\n${montarLink(token!)}`;

    let fone = normalizarFone(info?.phone ?? null);
    if (!fone) {
      const digitado = prompt(
        "Telefone com DDD para abrir o WhatsApp (ex: 11999999999):",
        "",
      );
      fone = normalizarFone(digitado);
      if (!fone) {
        toast.error("Telefone não informado.");
        return;
      }
    }
    const url = `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
    // Copia a mensagem como fallback (alguns ambientes bloqueiam o WhatsApp em iframe)
    navigator.clipboard?.writeText(texto).catch(() => {});
    // Abre como navegação de topo via <a>, evitando bloqueio do preview
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Abrindo WhatsApp. Mensagem copiada como backup.");
  }


  return (
    <AdminShell title="Redefinições de senha">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Redefinições de senha</h1>
            <p className="text-sm text-white/60 mt-1">
              Clique em WhatsApp: o pedido é aprovado automaticamente e o link vai na mensagem.
            </p>
          </div>
          <div className="flex gap-2">
            {(["pendente", "historico", "todos"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border transition ${
                  filter === f
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                }`}
              >
                {f === "pendente" ? "Pendentes" : f === "historico" ? "Histórico" : "Todos"}
              </button>
            ))}
            <button
              onClick={invalidate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-white/60 text-sm">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="pp-card rounded-2xl p-10 text-center text-white/60">
            {filter === "pendente"
              ? "Nenhum pedido pendente."
              : filter === "historico"
                ? "Nenhum pedido no histórico."
                : "Nenhum pedido."}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((r) => (
              <div
                key={r.id}
                className="pp-card rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">
                    {(r.user_id && telefones[r.user_id]?.full_name) || r.email}
                  </div>
                  {r.user_id && telefones[r.user_id]?.full_name && (
                    <div className="text-xs text-white/50 truncate">{r.email}</div>
                  )}
                  <div className="text-xs text-white/50 mt-0.5">
                    Pediu em {formatDateTime(r.created_at)}
                    {r.resolved_at && (
                      <> · resolvido em {formatDateTime(r.resolved_at)}</>
                    )}
                    {r.observacao && <> · {r.observacao}</>}
                  </div>
                  {!r.user_id && (
                    <div className="text-xs text-amber-400 mt-1">
                      ⚠️ E-mail não localizado em auth.users
                    </div>
                  )}
                  {r.status === "aprovado" && r.token && (
                    <div className="mt-2">
                      <input
                        readOnly
                        value={montarLink(r.token)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/80 font-mono"
                      />
                      <div className="text-[10px] text-white/40 mt-1">
                        Válido até{" "}
                        {r.token_expires_at
                          ? formatDateTime(r.token_expires_at)
                          : "24h"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  {r.status === "pendente" && (
                    <button
                      onClick={() => rejeitar(r.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" /> Rejeitar
                    </button>
                  )}
                  {r.status === "aprovado" && r.token && (
                    <>
                      <button
                        onClick={() => copiarLink(r.token!)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1.5"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Copiar link
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => enviarWhatsApp(r)}
                    title="Abrir WhatsApp de quem pediu"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function montarLink(token: string) {
  const origin =
    typeof window !== "undefined" && !window.location.hostname.includes("id-preview")
      ? window.location.origin
      : "https://rotas66.lovable.app";
  return `${origin}/reset-password?token=${token}`;
}

function normalizarFone(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 11) d = "55" + d;
  return d;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    aprovado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejeitado: "bg-red-500/15 text-red-300 border-red-500/30",
    usado: "bg-white/10 text-white/60 border-white/15",
    expirado: "bg-white/5 text-white/40 border-white/10",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? ""}`}
    >
      {status}
    </span>
  );
}
