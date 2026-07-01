import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Link2, Mail, Send, X } from "lucide-react";
import {
  criarConviteLoja,
  listarConvitesLoja,
  cancelarConviteLoja,
  listarLojasParaConvite,
  listarRevendedoresParaConvite,
} from "@/lib/convites-loja.functions";

const QK = ["admin-convites-loja"];

export function ConvitesLojaSection() {
  const qc = useQueryClient();
  const criar = useServerFn(criarConviteLoja);
  const listar = useServerFn(listarConvitesLoja);
  const cancelar = useServerFn(cancelarConviteLoja);
  const listarLojas = useServerFn(listarLojasParaConvite);
  const listarRevs = useServerFn(listarRevendedoresParaConvite);

  const { data: convites, isLoading } = useQuery({ queryKey: QK, queryFn: () => listar() });
  const { data: lojas } = useQuery({ queryKey: ["admin-convites-lojas-list"], queryFn: () => listarLojas() });
  const { data: revs } = useQuery({ queryKey: ["admin-convites-revs-list"], queryFn: () => listarRevs() });

  const [form, setForm] = useState({ loja_id: "", revendedor_id: "", email: "", dias: "7" });

  const criarMut = useMutation({
    mutationFn: async () => {
      return await criar({
        data: {
          loja_id: form.loja_id,
          revendedor_id: form.revendedor_id || null,
          email_destinatario: form.email || null,
          dias_validade: Number(form.dias) || 7,
        },
      });
    },
    onSuccess: (res) => {
      const link = `${window.location.origin}/convite-loja/${res.token}`;
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Convite criado — link copiado!");
      setForm({ loja_id: "", revendedor_id: "", email: "", dias: "7" });
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar convite"),
  });

  const cancelarMut = useMutation({
    mutationFn: async (id: string) => cancelar({ data: { id } }),
    onSuccess: () => {
      toast.success("Convite cancelado");
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/convite-loja/${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copiado")).catch(() => toast.error("Falha ao copiar"));
  };

  const statusColor: Record<string, string> = {
    pendente: "bg-amber-500/20 text-amber-400",
    aceito: "bg-green-600/20 text-green-400",
    expirado: "bg-zinc-600/20 text-zinc-400",
    cancelado: "bg-red-600/20 text-red-400",
  };

  return (
    <section className="pp-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Send className="h-5 w-5 text-white/80" />
        <h2 className="text-lg font-semibold text-white">Convites de vínculo de loja</h2>
      </div>
      <p className="text-xs text-white/60 mb-4">
        Gere um link único para que um revendedor vincule uma loja ao perfil dele. O link expira automaticamente.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <label className="text-xs text-white/70 flex flex-col gap-1">
          Loja
          <select
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
            value={form.loja_id}
            onChange={(e) => setForm({ ...form, loja_id: e.target.value })}
          >
            <option value="">Selecione uma loja</option>
            {(lojas ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}{l.cidade ? ` — ${l.cidade}` : ""}{l.revendedor_id ? " (já vinculada)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/70 flex flex-col gap-1">
          Revendedor (opcional)
          <select
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
            value={form.revendedor_id}
            onChange={(e) => setForm({ ...form, revendedor_id: e.target.value })}
          >
            <option value="">Qualquer revendedor</option>
            {(revs ?? []).map((r) => (
              <option key={r.user_id} value={r.user_id}>{r.nome} — {r.email}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/70 flex flex-col gap-1">
          E-mail (opcional)
          <input
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            placeholder="revendedor@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="text-xs text-white/70 flex flex-col gap-1">
          Validade (dias)
          <input
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
            value={form.dias}
            onChange={(e) => setForm({ ...form, dias: e.target.value })}
          />
        </label>
      </div>
      <button
        className="px-4 py-2 rounded-lg font-semibold text-black disabled:opacity-50"
        style={{ background: "var(--rota-gold)" }}
        disabled={criarMut.isPending || !form.loja_id}
        onClick={() => criarMut.mutate()}
      >
        {criarMut.isPending ? "Gerando…" : "Gerar link de convite"}
      </button>

      <div className="mt-6">
        <div className="text-sm font-semibold text-white/80 mb-2">Convites emitidos</div>
        {isLoading ? (
          <div className="text-white/50 text-sm">Carregando…</div>
        ) : !convites || convites.length === 0 ? (
          <div className="text-white/50 text-sm">Nenhum convite ainda.</div>
        ) : (
          <div className="space-y-2">
            {convites.map((c: any) => {
              const expirado = new Date(c.expira_em).getTime() < Date.now();
              const st = c.status === "pendente" && expirado ? "expirado" : c.status;
              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-semibold truncate">
                        {c.lojas?.nome ?? "Loja"}
                      </div>
                      <div className="text-[11px] text-white/50 flex flex-wrap items-center gap-2">
                        {c.revendedores?.nome ? (
                          <span>→ {c.revendedores.nome}</span>
                        ) : (
                          <span>→ Qualquer revendedor</span>
                        )}
                        {c.email_destinatario && (
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email_destinatario}</span>
                        )}
                        <span>Expira {new Date(c.expira_em).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusColor[st] ?? "bg-zinc-600/20 text-zinc-400"}`}>
                        {st}
                      </span>
                      {st === "pendente" && (
                        <>
                          <button
                            onClick={() => copyLink(c.token)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15"
                          >
                            <Copy className="h-3 w-3" /> Copiar link
                          </button>
                          <button
                            onClick={() => confirm("Cancelar este convite?") && cancelarMut.mutate(c.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {st === "pendente" && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50 font-mono truncate">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{`${typeof window !== "undefined" ? window.location.origin : ""}/convite-loja/${c.token}`}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
