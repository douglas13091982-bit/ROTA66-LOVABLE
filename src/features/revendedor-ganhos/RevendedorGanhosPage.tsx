import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Wallet, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Row = {
  id: string;
  competencia: string;
  loja_nome: string;
  valor_total: number;
  taxa_admin: number;
  valor_liquido: number;
  pago: boolean;
  pago_em: string | null;
};

type Saque = {
  id: string;
  valor: number;
  pix_chave: string;
  status: string;
  created_at: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
};

export function RevendedorGanhosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pixChave, setPixChave] = useState("");
  const [valorInput, setValorInput] = useState("");

  const { data, isLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["revendedor-ganhos", user?.id],
    queryFn: async () => {
      const { data: rev, error: revErr } = await (supabase as any)
        .from("revendedores")
        .select("percentual_receita")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (revErr) throw revErr;
      const percentualAdm = Number(rev?.percentual_receita ?? 0);

      const { data: lojas, error: lErr } = await (supabase as any)
        .from("lojas")
        .select("id, nome")
        .eq("revendedor_id", user!.id);
      if (lErr) throw lErr;
      const lojasList = (lojas ?? []) as { id: string; nome: string }[];
      if (lojasList.length === 0) return { percentualAdm, rows: [] as Row[] };

      const nomeMap = new Map(lojasList.map((l) => [l.id, l.nome]));
      const { data: mens, error: mErr } = await (supabase as any)
        .from("mensalidades_loja")
        .select("id, loja_id, competencia, valor, valor_total, pago, pago_em")
        .in("loja_id", lojasList.map((l) => l.id))
        .order("competencia", { ascending: false });
      if (mErr) throw mErr;

      const rows: Row[] = (mens ?? []).map((m: any) => {
        const total = Number(m.valor_total ?? m.valor ?? 0);
        const liquido = +(total * (percentualAdm / 100)).toFixed(2);
        return {
          id: m.id,
          competencia: m.competencia,
          loja_nome: nomeMap.get(m.loja_id) ?? "—",
          valor_total: total,
          taxa_admin: +(total - liquido).toFixed(2),
          valor_liquido: liquido,
          pago: !!m.pago,
          pago_em: m.pago_em,
        };
      });
      return { percentualAdm, rows };
    },
  });

  const { data: saques } = useQuery({
    enabled: !!user?.id,
    queryKey: ["revendedor-saques", user?.id],
    queryFn: async (): Promise<Saque[]> => {
      const { data, error } = await (supabase as any)
        .from("revendedor_saques")
        .select("*")
        .eq("revendedor_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Saque[];
    },
  });

  const rows = data?.rows ?? [];
  const percentualAdm = data?.percentualAdm ?? 0;
  const totalLiquidoPago = rows.filter((r) => r.pago).reduce((s, r) => s + r.valor_liquido, 0);
  const totalBruto = rows.filter((r) => r.pago).reduce((s, r) => s + r.valor_total, 0);
  const totalTaxa = rows.filter((r) => r.pago).reduce((s, r) => s + r.taxa_admin, 0);

  const jaSacado = (saques ?? [])
    .filter((s) => s.status === "pago" || s.status === "pendente")
    .reduce((s, r) => s + Number(r.valor), 0);
  const disponivel = +(totalLiquidoPago - jaSacado).toFixed(2);

  const solicitarSaque = useMutation({
    mutationFn: async () => {
      const valor = Number(valorInput.replace(",", "."));
      if (!valor || valor <= 0) throw new Error("Informe um valor válido");
      if (valor > disponivel) throw new Error("Valor maior que o disponível");
      if (!pixChave.trim()) throw new Error("Informe sua chave PIX");
      const { error } = await (supabase as any).from("revendedor_saques").insert({
        revendedor_user_id: user!.id,
        valor,
        pix_chave: pixChave.trim(),
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! O admin foi notificado.");
      setDialogOpen(false);
      setValorInput("");
      qc.invalidateQueries({ queryKey: ["revendedor-saques"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao solicitar saque"),
  });

  const statusBadge = (s: string) => {
    if (s === "pago") return "bg-green-600/20 text-green-400";
    if (s === "rejeitado") return "bg-red-600/20 text-red-400";
    return "bg-yellow-600/20 text-yellow-400";
  };

  return (
    <RevendedorShell title="Ganhos">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-white mb-2">Meus ganhos</h1>
        <p className="text-white/60 text-sm mb-6">
          Comissão sobre os planos das lojas que você indicou. Sua comissão:{" "}
          <span className="text-white font-semibold">{percentualAdm}%</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Wallet className="h-4 w-4" /> Bruto pago
            </div>
            <div className="text-white text-lg font-bold">R$ {totalBruto.toFixed(2)}</div>
          </div>
          <div className="pp-card rounded-2xl p-5">
            <div className="text-white/50 text-xs mb-1">Retido plataforma</div>
            <div className="text-white text-lg font-bold">R$ {totalTaxa.toFixed(2)}</div>
          </div>
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--rota-gold)" }}>
              <TrendingUp className="h-4 w-4" /> Líquido total
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--rota-gold)" }}>
              R$ {totalLiquidoPago.toFixed(2)}
            </div>
          </div>
          <div className="pp-card rounded-2xl p-5">
            <div className="text-white/50 text-xs mb-1">Disponível p/ saque</div>
            <div className="text-white text-lg font-bold">R$ {disponivel.toFixed(2)}</div>
          </div>
        </div>

        <div className="mb-6">
          <button
            disabled={disponivel <= 0}
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--rota-gold)" }}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Sacar ganhos
          </button>
        </div>

        {saques && saques.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Meus saques</h2>
            <div className="space-y-2">
              {saques.map((s) => (
                <div key={s.id} className="pp-card rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-white font-semibold">R$ {Number(s.valor).toFixed(2)}</div>
                    <div className="text-xs text-white/50">
                      PIX: {s.pix_chave} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </div>
                    {s.motivo_rejeicao && (
                      <div className="text-xs text-red-400 mt-1">Motivo: {s.motivo_rejeicao}</div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusBadge(s.status)}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-white/50 text-sm">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="pp-card rounded-2xl p-8 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <div className="text-white font-semibold mb-1">Nenhum ganho ainda</div>
            <div className="text-sm text-white/60">
              Assim que suas lojas pagarem uma mensalidade, os valores aparecem aqui.
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
              Extrato detalhado por competência
            </h2>
            {(() => {
              const grupos = new Map<string, Row[]>();
              for (const r of rows) {
                const key = r.competencia.slice(0, 7); // YYYY-MM
                if (!grupos.has(key)) grupos.set(key, []);
                grupos.get(key)!.push(r);
              }
              const ordenado = Array.from(grupos.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

              return (
                <div className="space-y-6">
                  {ordenado.map(([mes, itens]) => {
                    const comp = new Date(mes + "-01T00:00:00");
                    const label = comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                    const brutoMes = itens.filter((i) => i.pago).reduce((s, i) => s + i.valor_total, 0);
                    const taxaMes = itens.filter((i) => i.pago).reduce((s, i) => s + i.taxa_admin, 0);
                    const liqMes = itens.filter((i) => i.pago).reduce((s, i) => s + i.valor_liquido, 0);
                    const pagas = itens.filter((i) => i.pago).length;

                    return (
                      <div key={mes} className="pp-card rounded-2xl p-5">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-white/10">
                          <div>
                            <div className="text-white font-bold capitalize">{label}</div>
                            <div className="text-xs text-white/50">
                              {pagas} de {itens.length} loja(s) paga(s)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-white/50">Líquido do mês</div>
                            <div className="font-bold text-lg" style={{ color: "var(--rota-gold)" }}>
                              R$ {liqMes.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-white/40">
                              Bruto R$ {brutoMes.toFixed(2)} · Taxa R$ {taxaMes.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {itens.map((r) => (
                            <div key={r.id} className="rounded-xl bg-white/5 p-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                                <div>
                                  <div className="text-white font-semibold text-sm">{r.loja_nome}</div>
                                  <div className="text-[11px] text-white/50">
                                    {r.pago && r.pago_em
                                      ? `Pago em ${new Date(r.pago_em).toLocaleDateString("pt-BR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })} às ${new Date(r.pago_em).toLocaleTimeString("pt-BR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}`
                                      : "Aguardando pagamento da loja"}
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                    r.pago ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
                                  }`}
                                >
                                  {r.pago ? "Pago" : "Em aberto"}
                                </span>
                              </div>

                              <div className="rounded-lg bg-black/20 p-3 space-y-1.5 text-xs font-mono">
                                <div className="flex items-center justify-between text-white/70">
                                  <span>Valor do plano</span>
                                  <span className="text-white">R$ {r.valor_total.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-white/70">
                                  <span>Taxa plataforma ({percentualAdm}%)</span>
                                  <span className="text-red-300">
                                    − R$ {r.taxa_admin.toFixed(2)}
                                  </span>
                                </div>
                                <div className="border-t border-white/10 pt-1.5 flex items-center justify-between font-bold">
                                  <span className="text-white/80">
                                    = Líquido {r.pago ? "recebido" : "previsto"}
                                  </span>
                                  <span style={{ color: "var(--rota-gold)" }}>
                                    R$ {r.valor_liquido.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-white/40 pt-1">
                                  Cálculo: {r.valor_total.toFixed(2)} × (100% − {percentualAdm}%) ={" "}
                                  {r.valor_liquido.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDialogOpen(false)}>
          <div className="pp-card rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Solicitar saque</h3>
            <p className="text-xs text-white/60 mb-4">
              Disponível: <span className="text-white font-semibold">R$ {disponivel.toFixed(2)}</span>
            </p>
            <label className="block text-xs text-white/60 mb-1">Valor (R$)</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm mb-3"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
            <label className="block text-xs text-white/60 mb-1">Chave PIX</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm mb-4"
              value={pixChave}
              onChange={(e) => setPixChave(e.target.value)}
              placeholder="CPF, e-mail, telefone ou aleatória"
            />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5" onClick={() => setDialogOpen(false)}>
                Cancelar
              </button>
              <button
                disabled={solicitarSaque.isPending}
                onClick={() => solicitarSaque.mutate()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-50"
                style={{ background: "var(--rota-gold)" }}
              >
                {solicitarSaque.isPending ? "Enviando…" : "Solicitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RevendedorShell>
  );
}
