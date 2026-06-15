import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { supabase } from "@/integrations/supabase/client";
import { useMinhaLoja } from "@/hooks/use-loja";
import { Loader2, QrCode, Check } from "lucide-react";
import { PixPagamentoDialog } from "@/components/PixPagamentoDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loja/financeiro")({
  component: FinanceiroLojaPage,
});

type Cobranca = {
  id: string; pedido_id: string; valor: number; vencimento: string;
  pago: boolean; pago_em: string | null; created_at: string;
  pago_solicitado_em?: string | null;
};
type Mensalidade = {
  id: string; competencia: string; valor: number; vencimento: string;
  pago: boolean; pago_em: string | null; created_at: string;
  pago_solicitado_em?: string | null;
};

type PixCfg = {
  pix_chave_sistema: string | null;
  pix_titular_sistema: string | null;
  pix_cidade_sistema: string | null;
};

type DialogState =
  | null
  | {
      tipo: "mensalidade" | "cobranca" | "agrupado-mensalidade" | "agrupado-cobranca";
      valor: number;
      ids: string[];
      titulo: string;
      descricao: string;
    };

function FinanceiroLojaPage() {
  const { data: loja } = useMinhaLoja();
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [prazo, setPrazo] = useState<number>(30);
  const [mensalidadeValor, setMensalidadeValor] = useState<number>(0);
  const [pixCfg, setPixCfg] = useState<PixCfg>({
    pix_chave_sistema: null, pix_titular_sistema: null, pix_cidade_sistema: null,
  });
  const [dialog, setDialog] = useState<DialogState>(null);

  async function carregar() {
    if (!loja?.id) return;
    setLoading(true);
    const [{ data: cfg }, { data: cob }, { data: mens }] = await Promise.all([
      (supabase as any).rpc("get_pix_sistema").then((r: any) => ({ data: r.data?.[0] ?? null })),
      supabase.from("cobrancas_loja").select("*").eq("loja_id", loja.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("mensalidades_loja").select("*").eq("loja_id", loja.id).order("competencia", { ascending: false }).limit(60),
    ]);
    if (cfg) {
      setPrazo(Number((cfg as any).prazo_pagamento_dias));
      setPixCfg({
        pix_chave_sistema: (cfg as any).pix_chave_sistema ?? null,
        pix_titular_sistema: (cfg as any).pix_titular_sistema ?? null,
        pix_cidade_sistema: (cfg as any).pix_cidade_sistema ?? null,
      });
    }
    const lj: any = loja;
    const valor = lj.mensalidade_valor != null ? Number(lj.mensalidade_valor) : Number(cfg?.mensalidade_valor_padrao ?? 0);
    setMensalidadeValor(valor);
    setCobrancas((cob as Cobranca[]) ?? []);
    setMensalidades((mens as Mensalidade[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [loja?.id]);

  const cobAbertas = cobrancas.filter((c) => !c.pago);
  const mensAbertas = mensalidades.filter((m) => !m.pago);
  const cobAberto = cobAbertas.reduce((s, c) => s + Number(c.valor), 0);
  const mensAberto = mensAbertas.reduce((s, m) => s + Number(m.valor), 0);
  const totalAberto = cobAberto + mensAberto;
  const totalPago = cobrancas.filter((c) => c.pago).reduce((s, c) => s + Number(c.valor), 0)
    + mensalidades.filter((m) => m.pago).reduce((s, m) => s + Number(m.valor), 0);
  const prox = [...cobAbertas.map((c) => c.vencimento), ...mensAbertas.map((m) => m.vencimento)].sort()[0];

  async function marcarSolicitado(tabela: "cobrancas_loja" | "mensalidades_loja", ids: string[]) {
    const { error } = await supabase
      .from(tabela)
      .update({ pago_solicitado_em: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento informado ao admin");
    await carregar();
  }

  if (!loja) {
    return <LojaShell title="Financeiro"><p className="text-muted-foreground">Crie sua loja primeiro.</p></LojaShell>;
  }

  return (
    <LojaShell title="Financeiro">
      <div className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Em aberto</div>
            <div className="font-display text-3xl text-primary mt-1">R$ {totalAberto.toFixed(2)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Já pago</div>
            <div className="font-display text-3xl mt-1">R$ {totalPago.toFixed(2)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Mensalidade</div>
            <div className="font-display text-2xl mt-1">R$ {mensalidadeValor.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">por mês</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Próximo vencimento</div>
            <div className="font-display text-xl mt-1">{prox ? new Date(prox + (prox.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—"}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          A cada pedido entregue é gerada uma taxa para o sistema, com prazo de <strong className="text-foreground">{prazo} dias</strong>.
          Além disso, a loja paga uma <strong className="text-foreground">mensalidade fixa</strong> para utilizar a plataforma.
        </div>

        {/* Mensalidades */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl">Mensalidades</h2>
            <button
              disabled={mensAbertas.length === 0 || !pixCfg.pix_chave_sistema}
              onClick={() =>
                setDialog({
                  tipo: "agrupado-mensalidade",
                  valor: mensAberto,
                  ids: mensAbertas.map((m) => m.id),
                  titulo: "Pagar mensalidades em aberto",
                  descricao: `${mensAbertas.length} mensalidade(s) — total R$ ${mensAberto.toFixed(2)}`,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!pixCfg.pix_chave_sistema ? "PIX do sistema ainda não configurado" : undefined}
            >
              <QrCode className="h-4 w-4" />
              Pagar tudo via PIX
            </button>
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            : mensalidades.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma mensalidade gerada ainda.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2">Competência</th>
                      <th className="text-right">Valor</th>
                      <th className="text-left pl-4">Vencimento</th>
                      <th className="text-left pl-4">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mensalidades.map((m) => {
                      const venc = new Date(m.vencimento + "T00:00:00");
                      const comp = new Date(m.competencia + "T00:00:00");
                      const atrasada = !m.pago && venc < new Date();
                      const solicitado = !m.pago && !!m.pago_solicitado_em;
                      return (
                        <tr key={m.id} className="border-b border-border/50">
                          <td className="py-2">{comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</td>
                          <td className="text-right">R$ {Number(m.valor).toFixed(2)}</td>
                          <td className="pl-4">{venc.toLocaleDateString("pt-BR")}</td>
                          <td className="pl-4">
                            {m.pago ? <span className="text-green-500 text-xs font-bold uppercase">Paga</span>
                              : solicitado ? <span className="text-amber-500 text-xs font-bold uppercase">Aguardando confirmação</span>
                              : atrasada ? <span className="text-primary text-xs font-bold uppercase">Atrasada</span>
                                : <span className="text-muted-foreground text-xs font-bold uppercase">Em aberto</span>}
                          </td>
                          <td className="pl-4 text-right">
                            {!m.pago && (
                              <button
                                onClick={() =>
                                  setDialog({
                                    tipo: "mensalidade",
                                    valor: Number(m.valor),
                                    ids: [m.id],
                                    titulo: `Pagar mensalidade ${comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
                                    descricao: `Vencimento ${venc.toLocaleDateString("pt-BR")}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                              >
                                <QrCode className="h-3 w-3" /> Pagar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Cobranças por pedido */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl">Taxas por pedido</h2>
            <button
              disabled={cobAbertas.length === 0 || !pixCfg.pix_chave_sistema}
              onClick={() =>
                setDialog({
                  tipo: "agrupado-cobranca",
                  valor: cobAberto,
                  ids: cobAbertas.map((c) => c.id),
                  titulo: "Pagar taxas de entrega em aberto",
                  descricao: `${cobAbertas.length} cobrança(s) — total R$ ${cobAberto.toFixed(2)}`,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!pixCfg.pix_chave_sistema ? "PIX do sistema ainda não configurado" : undefined}
            >
              <QrCode className="h-4 w-4" />
              Pagar tudo via PIX
            </button>
          </div>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            : cobrancas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma cobrança ainda.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2">Gerada em</th>
                      <th className="text-right">Valor</th>
                      <th className="text-left pl-4">Vencimento</th>
                      <th className="text-left pl-4">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrancas.map((c) => {
                      const venc = new Date(c.vencimento);
                      const atrasado = !c.pago && venc < new Date();
                      const solicitado = !c.pago && !!c.pago_solicitado_em;
                      return (
                        <tr key={c.id} className="border-b border-border/50">
                          <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="text-right">R$ {Number(c.valor).toFixed(2)}</td>
                          <td className="pl-4">{venc.toLocaleDateString("pt-BR")}</td>
                          <td className="pl-4">
                            {c.pago ? <span className="text-green-500 text-xs font-bold uppercase inline-flex items-center gap-1"><Check className="h-3 w-3" /> Pago</span>
                              : solicitado ? <span className="text-amber-500 text-xs font-bold uppercase">Aguardando confirmação</span>
                              : atrasado ? <span className="text-primary text-xs font-bold uppercase">Atrasado</span>
                                : <span className="text-muted-foreground text-xs font-bold uppercase">Em aberto</span>}
                          </td>
                          <td className="pl-4 text-right">
                            {!c.pago && (
                              <button
                                onClick={() =>
                                  setDialog({
                                    tipo: "cobranca",
                                    valor: Number(c.valor),
                                    ids: [c.id],
                                    titulo: "Pagar taxa do pedido",
                                    descricao: `Vencimento ${venc.toLocaleDateString("pt-BR")}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                              >
                                <QrCode className="h-3 w-3" /> Pagar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      <PixPagamentoDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        titulo={dialog?.titulo ?? ""}
        descricao={dialog?.descricao}
        valor={dialog?.valor ?? 0}
        chavePix={pixCfg.pix_chave_sistema}
        titular={pixCfg.pix_titular_sistema}
        cidade={pixCfg.pix_cidade_sistema}
        txid={`LOJA${(loja.id ?? "").replace(/-/g, "").slice(0, 18)}`}
        onMarcarPago={
          dialog
            ? async () => {
                const tabela = dialog.tipo.includes("mensalidade") ? "mensalidades_loja" : "cobrancas_loja";
                await marcarSolicitado(tabela, dialog.ids);
              }
            : undefined
        }
        marcarLabel="Já paguei — avisar admin"
      />
    </LojaShell>
  );
}
