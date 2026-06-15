import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, CheckCircle2, RefreshCw, BellRing } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  component: FinanceiroAdminPage,
});

type Cobranca = {
  id: string;
  loja_id: string;
  pedido_id: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
};

type Mensalidade = {
  id: string;
  loja_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
};

function FinanceiroAdminPage() {
  const [taxa, setTaxa] = useState<number>(2);
  const [prazo, setPrazo] = useState<number>(30);
  const [mensalidadePadrao, setMensalidadePadrao] = useState<number>(0);
  const [diaVenc, setDiaVenc] = useState<number>(10);
  const [pixChave, setPixChave] = useState<string>("");
  const [pixTitular, setPixTitular] = useState<string>("");
  const [pixCidade, setPixCidade] = useState<string>("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cobrancas, setCobrancas] = useState<(Cobranca & { loja_nome?: string; pago_solicitado_em?: string | null })[]>([]);
  const [mensalidades, setMensalidades] = useState<(Mensalidade & { loja_nome?: string; pago_solicitado_em?: string | null })[]>([]);

  async function carregar() {
    setLoading(true);
    const { data: cfg } = await supabase
      .from("config_financeiro")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (cfg) {
      setConfigId(cfg.id);
      setTaxa(Number(cfg.taxa_por_pedido));
      setPrazo(Number(cfg.prazo_pagamento_dias));
      setMensalidadePadrao(Number(cfg.mensalidade_valor_padrao ?? 0));
      setDiaVenc(Number(cfg.dia_vencimento_padrao ?? 10));
      setPixChave((cfg as any).pix_chave_sistema ?? "");
      setPixTitular((cfg as any).pix_titular_sistema ?? "");
      setPixCidade((cfg as any).pix_cidade_sistema ?? "");
    }
    const [{ data: cob }, { data: mens }] = await Promise.all([
      supabase.from("cobrancas_loja").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("mensalidades_loja").select("*").order("competencia", { ascending: false }).limit(200),
    ]);
    const ids = Array.from(new Set([...(cob ?? []).map((c) => c.loja_id), ...(mens ?? []).map((m) => m.loja_id)]));
    let lojaMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: lojas } = await supabase.from("lojas").select("id, nome").in("id", ids);
      lojaMap = Object.fromEntries((lojas ?? []).map((l: any) => [l.id, l.nome]));
    }
    setCobrancas((cob ?? []).map((c: any) => ({ ...c, loja_nome: lojaMap[c.loja_id] })));
    setMensalidades((mens ?? []).map((m: any) => ({ ...m, loja_nome: lojaMap[m.loja_id] })));
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel("admin-financeiro-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cobrancas_loja" }, (payload) => {
        carregar();
        const novo: any = payload.new;
        const antigo: any = payload.old;
        if (payload.eventType === "UPDATE" && novo?.pago_solicitado_em && !novo?.pago && antigo?.pago_solicitado_em !== novo?.pago_solicitado_em) {
          toast.info(`Uma loja avisou o pagamento de uma taxa (R$ ${Number(novo.valor).toFixed(2)})`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mensalidades_loja" }, (payload) => {
        carregar();
        const novo: any = payload.new;
        const antigo: any = payload.old;
        if (payload.eventType === "UPDATE" && novo?.pago_solicitado_em && !novo?.pago && antigo?.pago_solicitado_em !== novo?.pago_solicitado_em) {
          toast.info(`Uma loja avisou o pagamento de uma mensalidade (R$ ${Number(novo.valor).toFixed(2)})`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function salvar() {
    setSaving(true);
    const payload = {
      taxa_por_pedido: taxa,
      prazo_pagamento_dias: prazo,
      mensalidade_valor_padrao: mensalidadePadrao,
      dia_vencimento_padrao: Math.min(Math.max(diaVenc, 1), 28),
      pix_chave_sistema: pixChave.trim() || null,
      pix_titular_sistema: pixTitular.trim() || null,
      pix_cidade_sistema: pixCidade.trim() || null,
      singleton: true,
    };
    const q = configId
      ? supabase.from("config_financeiro").update(payload).eq("id", configId)
      : supabase.from("config_financeiro").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    carregar();
  }


  async function gerarMensalidades() {
    setGerando(true);
    const { data, error } = await supabase.rpc("gerar_mensalidades_mes");
    setGerando(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} mensalidade(s) geradas para este mês`);
    carregar();
  }

  async function quitarCobrancasLoja(lojaId: string) {
    const { error } = await supabase
      .from("cobrancas_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("loja_id", lojaId)
      .eq("pago", false);
    if (error) return toast.error(error.message);
    toast.success("Cobranças quitadas");
    carregar();
  }

  async function marcarCobrancaPaga(id: string) {
    const { error } = await supabase
      .from("cobrancas_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança quitada");
    carregar();
  }

  async function marcarMensalidadePaga(id: string) {
    const { error } = await supabase
      .from("mensalidades_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mensalidade quitada");
    carregar();
  }

  const cobAguardando = cobrancas.filter((c) => !c.pago && !!c.pago_solicitado_em);
  const mensAguardando = mensalidades.filter((m) => !m.pago && !!m.pago_solicitado_em);
  const totalAguardando = cobAguardando.length + mensAguardando.length;

  async function quitarVarias(tabela: "cobrancas_loja" | "mensalidades_loja", ids: string[]) {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from(tabela)
      .update({ pago: true, pago_em: new Date().toISOString() })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} pagamento(s) confirmado(s)`);
    carregar();
  }

  return (
    <AdminShell title="Financeiro">
      <div className="space-y-6 max-w-5xl">
        {totalAguardando > 0 && (
          <section className="bg-card border-2 border-amber-500/50 rounded-lg p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-display text-xl flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-500" />
                Pagamentos aguardando sua confirmação
                <span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-500 text-background text-xs font-bold">
                  {totalAguardando}
                </span>
              </h2>
              <div className="flex gap-2">
                {cobAguardando.length > 0 && (
                  <button
                    onClick={() => quitarVarias("cobrancas_loja", cobAguardando.map((c) => c.id))}
                    className="px-3 py-1.5 bg-card border border-border text-xs font-bold uppercase rounded-md hover:bg-background"
                  >
                    Confirmar {cobAguardando.length} taxa(s)
                  </button>
                )}
                {mensAguardando.length > 0 && (
                  <button
                    onClick={() => quitarVarias("mensalidades_loja", mensAguardando.map((m) => m.id))}
                    className="px-3 py-1.5 bg-card border border-border text-xs font-bold uppercase rounded-md hover:bg-background"
                  >
                    Confirmar {mensAguardando.length} mensalidade(s)
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left pl-4">Loja</th>
                    <th className="text-left pl-4">Referência</th>
                    <th className="text-right pl-4">Valor</th>
                    <th className="text-left pl-4">Loja avisou em</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mensAguardando.map((m) => (
                    <tr key={`m-${m.id}`} className="border-b border-border/50">
                      <td className="py-2"><span className="text-xs font-bold uppercase text-amber-500">Mensalidade</span></td>
                      <td className="pl-4">{m.loja_nome || "—"}</td>
                      <td className="pl-4">{new Date(m.competencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</td>
                      <td className="text-right pl-4">R$ {Number(m.valor).toFixed(2)}</td>
                      <td className="pl-4">{(m as any).pago_solicitado_em ? formatDateTime((m as any).pago_solicitado_em) : "—"}</td>
                      <td className="text-right">
                        <button onClick={() => marcarMensalidadePaga(m.id)}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto">
                          <CheckCircle2 className="h-3 w-3" /> Confirmar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cobAguardando.map((c) => (
                    <tr key={`c-${c.id}`} className="border-b border-border/50">
                      <td className="py-2"><span className="text-xs font-bold uppercase text-primary">Taxa</span></td>
                      <td className="pl-4">{c.loja_nome || "—"}</td>
                      <td className="pl-4">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="text-right pl-4">R$ {Number(c.valor).toFixed(2)}</td>
                      <td className="pl-4">{c.pago_solicitado_em ? formatDateTime(c.pago_solicitado_em) : "—"}</td>
                      <td className="text-right">
                        <button onClick={() => marcarCobrancaPaga(c.id)}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto">
                          <CheckCircle2 className="h-3 w-3" /> Confirmar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-xl mb-1">Configurações financeiras</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Defina os valores padrão cobrados das lojas. A mensalidade pode ser personalizada por loja na aba <strong>Lojas</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taxa por pedido (R$)</span>
              <input type="number" min={0} step="0.01" value={taxa}
                onChange={(e) => setTaxa(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
              <span className="text-[10px] text-muted-foreground">Por pedido entregue · não se aplica a lojas com plano mensal ativo</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prazo p/ pagamento (dias)</span>
              <input type="number" min={1} step="1" value={prazo}
                onChange={(e) => setPrazo(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
              <span className="text-[10px] text-muted-foreground">Aplicado a cada cobrança gerada</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensalidade padrão (R$)</span>
              <input type="number" min={0} step="0.01" value={mensalidadePadrao}
                onChange={(e) => setMensalidadePadrao(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
              <span className="text-[10px] text-muted-foreground">Usado quando a loja não tem valor próprio</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dia de vencimento padrão</span>
              <input type="number" min={1} max={28} step="1" value={diaVenc}
                onChange={(e) => setDiaVenc(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
              <span className="text-[10px] text-muted-foreground">Entre 1 e 28</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={salvar} disabled={saving}
              className="px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </button>
            <button onClick={gerarMensalidades} disabled={gerando}
              className="px-4 py-2.5 bg-card border border-border text-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:bg-background disabled:opacity-50 flex items-center gap-2">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Gerar mensalidades deste mês
            </button>
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-xl mb-1">PIX do sistema</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Chave que as lojas vão usar para pagar mensalidades e taxas. Um QR Code com valor já embutido é gerado automaticamente para cada cobrança.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</span>
              <input type="text" value={pixChave}
                onChange={(e) => setPixChave(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titular</span>
              <input type="text" value={pixTitular}
                onChange={(e) => setPixTitular(e.target.value)}
                placeholder="Nome do recebedor"
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cidade</span>
              <input type="text" value={pixCidade}
                onChange={(e) => setPixCidade(e.target.value)}
                placeholder="BRASIL"
                className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm" />
            </label>
          </div>
          <div className="mt-4">
            <button onClick={salvar} disabled={saving}
              className="px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar PIX
            </button>
          </div>
        </section>



        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-xl mb-4">Mensalidades das lojas</h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : mensalidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensalidade gerada ainda. Use o botão acima.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2">Loja</th>
                    <th className="text-left pl-4">Competência</th>
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
                    const atrasado = !m.pago && venc < new Date();
                    const solicitado = !m.pago && !!(m as any).pago_solicitado_em;
                    return (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-2">{m.loja_nome || "—"}</td>
                        <td className="pl-4">{comp.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</td>
                        <td className="text-right">R$ {Number(m.valor).toFixed(2)}</td>
                        <td className="pl-4">{venc.toLocaleDateString("pt-BR")}</td>
                        <td className="pl-4">
                          {m.pago ? <span className="text-green-500 text-xs font-bold uppercase">Pago</span>
                            : solicitado ? <span className="text-amber-500 text-xs font-bold uppercase">Loja avisou pagamento</span>
                            : atrasado ? <span className="text-primary text-xs font-bold uppercase">Atrasada</span>
                              : <span className="text-muted-foreground text-xs font-bold uppercase">Em aberto</span>}
                        </td>
                        <td className="text-right">
                          {!m.pago && (
                            <button onClick={() => marcarMensalidadePaga(m.id)}
                              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Quitar
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
        </section>

        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="font-display text-xl mb-4">Cobranças por pedido</h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : cobrancas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
          ) : (() => {
            const totaisPorLoja = Object.values(
              cobrancas.reduce((acc, c) => {
                if (c.pago) return acc;
                const key = c.loja_id;
                if (!acc[key]) acc[key] = { loja_id: key, loja_nome: c.loja_nome || "—", total: 0, qtd: 0 };
                acc[key].total += Number(c.valor) || 0;
                acc[key].qtd += 1;
                return acc;
              }, {} as Record<string, { loja_id: string; loja_nome: string; total: number; qtd: number }>)
            ).sort((a, b) => b.total - a.total);
            return (
            <>
            {totaisPorLoja.length > 0 && (
              <div className="mb-6 border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground bg-background/40 border-b border-border">
                    <tr>
                      <th className="text-left py-2 px-3">Loja</th>
                      <th className="text-right px-3">Pedidos em aberto</th>
                      <th className="text-right px-3">Total devido</th>
                      <th className="text-right px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {totaisPorLoja.map((t) => (
                      <tr key={t.loja_id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 px-3 font-medium">{t.loja_nome}</td>
                        <td className="text-right px-3">{t.qtd}</td>
                        <td className="text-right px-3 font-bold text-primary">R$ {t.total.toFixed(2)}</td>
                        <td className="text-right px-3">
                          <button onClick={() => quitarCobrancasLoja(t.loja_id)}
                            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto">
                            <CheckCircle2 className="h-3 w-3" /> Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </>

            );
          })()}
        </section>

      </div>
    </AdminShell>
  );
}
