import { useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja, useIsLojaOwner } from "@/hooks/use-loja";
import { useAuth } from "@/hooks/use-auth";
import { PixPagamentoDialog } from "@/components/PixPagamentoDialog";
import { PagamentoMpMensalidadeDialog } from "./components/PagamentoMpMensalidadeDialog";
import { PagamentoMpCobrancaDialog } from "./components/PagamentoMpCobrancaDialog";
import { PagamentoMpFaturaDialog } from "./components/PagamentoMpFaturaDialog";
import { useFinanceiroLoja } from "./hooks/use-financeiro-loja";
import { calcularResumo } from "./logic/resumo";
import type { DialogState } from "./logic/types";
import { ResumoCards } from "./components/ResumoCards";
import { InfoPrazo } from "./components/InfoPrazo";
import { MensalidadesTabela } from "./components/MensalidadesTabela";
import { CobrancasTabela } from "./components/CobrancasTabela";
import { SaldoLojaCard } from "./components/SaldoLojaCard";
import { SaquesLojaCard } from "./components/SaquesLojaCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Receipt, CreditCard, History } from "lucide-react";


export function FinanceiroPage() {
  const { data: loja } = useMinhaLoja();
  const { user } = useAuth();
  const {
    cobrancas,
    mensalidades,
    loading,
    prazo,
    mensalidadeValor,
    pixCfg,
    carregar,
    marcarSolicitado,
  } = useFinanceiroLoja(loja);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [mpOpen, setMpOpen] = useState(false);
  const [mpMensId, setMpMensId] = useState<string | null>(null);
  const [mpCobId, setMpCobId] = useState<string | null>(null);
  const [mpFaturaOpen, setMpFaturaOpen] = useState(false);

  const isOwner = useIsLojaOwner(loja);

  if (!loja) {
    return (
      <LojaShell title="Financeiro">
        <p className="text-muted-foreground">Crie sua loja primeiro.</p>
      </LojaShell>
    );
  }

  if (!isOwner) {
    return (
      <LojaShell title="Financeiro">
        <p className="text-sm text-white/70 max-w-lg">
          Apenas o dono da loja tem acesso ao Financeiro. Fale com o responsável pela conta.
        </p>
      </LojaShell>
    );
  }

  const { cobAbertas, mensAbertas, cobAberto, mensAberto, totalAberto, totalPago, prox } =
    calcularResumo(cobrancas, mensalidades);
  const diaVenc = Number((loja as any).dia_vencimento_mensalidade ?? 0);
  const proxFallback = (() => {
    if (prox) return prox;
    if (!diaVenc || diaVenc < 1 || diaVenc > 31) return undefined;
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = hoje.getMonth();
    const diaHoje = hoje.getDate();
    const alvo = new Date(y, diaHoje <= diaVenc ? m : m + 1, diaVenc);
    const yyyy = alvo.getFullYear();
    const mm = String(alvo.getMonth() + 1).padStart(2, "0");
    const dd = String(alvo.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();
  const pixHabilitado = !!pixCfg.pix_chave_sistema;

  const handleDialog = (d: DialogState) => {
    if (d && (d.tipo === "mensalidade" || d.tipo === "agrupado-mensalidade")) {
      setMpMensId(d.tipo === "mensalidade" ? d.ids[0] : null);
      setMpOpen(true);
      return;
    }
    setDialog(d);
  };


  return (
    <LojaShell title="Financeiro">
      <div className="space-y-6 w-full">
        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
          <SaldoLojaCard lojaId={loja.id} />
          <SaquesLojaCard lojaId={loja.id} />
        </div>

        {/* Bottom Section with Tabs */}
        <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
          <Tabs defaultValue="resumo" className="w-full">
            <div className="flex w-full mb-8 bg-slate-50/50 rounded-xl p-1.5 border border-slate-200/60">
              <TabsList className="bg-transparent border-none p-0 h-auto rounded-none w-full flex justify-between gap-1">
                <TabsTrigger 
                  value="resumo" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-none data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200/50 transition-all text-muted-foreground"
                >
                  <History className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Resumo</span>
                  <div className="ml-auto data-[state=active]:block hidden w-1.5 h-1.5 rounded-full bg-destructive" />
                </TabsTrigger>
                <TabsTrigger 
                  value="mensalidade" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-none data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200/50 transition-all text-muted-foreground"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Mensalidade</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="taxas" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-none data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200/50 transition-all text-muted-foreground"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Taxas</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumo" className="space-y-6 mt-0 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ResumoCards
                totalAberto={totalAberto}
                totalPago={totalPago}
                mensalidadeValor={mensalidadeValor}
                prox={proxFallback}
                onAntecipar={() => {
                  setMpMensId(null);
                  setMpOpen(true);
                }}
              />
              <InfoPrazo prazo={prazo} />
            </TabsContent>

            <TabsContent value="mensalidade" className="space-y-6 mt-0 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <MensalidadesTabela
                loading={loading}
                mensalidades={mensalidades}
                mensAbertas={mensAbertas}
                mensAberto={mensAberto}
                pixHabilitado
                onDialog={handleDialog}
              />
            </TabsContent>

            <TabsContent value="taxas" className="space-y-6 mt-0 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CobrancasTabela
                loading={loading}
                cobrancas={cobrancas}
                cobAbertas={cobAbertas}
                cobAberto={cobAberto}
                pixHabilitado={pixHabilitado}
                onDialog={setDialog}
                onPagarMp={(id) => setMpCobId(id)}
                onPagarTudoMp={() => setMpFaturaOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PagamentoMpFaturaDialog
        open={mpFaturaOpen}
        onClose={() => {
          setMpFaturaOpen(false);
          carregar();
        }}
        cobrancaIds={cobAbertas.map((c) => c.id)}
        valorTotal={cobAberto}
        defaultEmail={user?.email ?? ""}
        defaultNome={(loja as any).nome ?? ""}
        defaultDoc={(loja as any).cnpj ?? ""}
        onPago={() => carregar()}
      />

      <PagamentoMpCobrancaDialog
        open={!!mpCobId}
        onClose={() => {
          setMpCobId(null);
          carregar();
        }}
        cobrancaId={mpCobId}
        defaultEmail={user?.email ?? ""}
        defaultNome={(loja as any).nome ?? ""}
        defaultDoc={(loja as any).cnpj ?? ""}
        onPago={() => carregar()}
      />

      <PagamentoMpMensalidadeDialog
        open={mpOpen}
        onClose={() => {
          setMpOpen(false);
          setMpMensId(null);
          carregar();
        }}
        lojaId={loja.id}
        mensalidadeId={mpMensId}
        defaultEmail={user?.email ?? ""}
        defaultNome={(loja as any).nome ?? ""}
        defaultDoc={(loja as any).cnpj ?? ""}
        onPago={() => {
          carregar();
        }}
      />


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
                const tabela = dialog.tipo.includes("mensalidade")
                  ? "mensalidades_loja"
                  : "cobrancas_loja";
                await marcarSolicitado(tabela, dialog.ids);
              }
            : undefined
        }
        marcarLabel="Já paguei — avisar admin"
      />
    </LojaShell>
  );
}
