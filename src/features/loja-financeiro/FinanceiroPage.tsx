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
import { PreviaSemanaCard } from "./components/PreviaSemanaCard";
import { SaldoLojaCard } from "./components/SaldoLojaCard";
import { SaquesLojaCard } from "./components/SaquesLojaCard";


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
      <div className="space-y-6 max-w-4xl">
        <SaldoLojaCard lojaId={loja.id} />
        <SaquesLojaCard lojaId={loja.id} />

        <ResumoCards
          totalAberto={totalAberto}
          totalPago={totalPago}
          mensalidadeValor={mensalidadeValor}
          prox={proxFallback}
        />
        <InfoPrazo prazo={prazo} />
        <MensalidadesTabela
          loading={loading}
          mensalidades={mensalidades}
          mensAbertas={mensAbertas}
          mensAberto={mensAberto}
          pixHabilitado
          onDialog={handleDialog}
        />
        <PreviaSemanaCard
          lojaId={loja.id}
          taxaPorPedido={Number(
            (loja as any).plano?.taxa_por_pedido ??
              (loja as any).taxa_por_pedido ??
              0,
          )}
          planoMensalAtivo={Boolean((loja as any).plano_mensal_ativo)}
        />
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
