import { useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { useAuth } from "@/hooks/use-auth";
import { PixPagamentoDialog } from "@/components/PixPagamentoDialog";
import { PagamentoMpMensalidadeDialog } from "./components/PagamentoMpMensalidadeDialog";
import { PagamentoMpCobrancaDialog } from "./components/PagamentoMpCobrancaDialog";
import { useFinanceiroLoja } from "./hooks/use-financeiro-loja";
import { calcularResumo } from "./logic/resumo";
import type { DialogState } from "./logic/types";
import { ResumoCards } from "./components/ResumoCards";
import { InfoPrazo } from "./components/InfoPrazo";
import { MensalidadesTabela } from "./components/MensalidadesTabela";
import { CobrancasTabela } from "./components/CobrancasTabela";
import { PreviaSemanaCard } from "./components/PreviaSemanaCard";

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

  if (!loja) {
    return (
      <LojaShell title="Financeiro">
        <p className="text-muted-foreground">Crie sua loja primeiro.</p>
      </LojaShell>
    );
  }

  const { cobAbertas, mensAbertas, cobAberto, mensAberto, totalAberto, totalPago, prox } =
    calcularResumo(cobrancas, mensalidades);
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
        <ResumoCards
          totalAberto={totalAberto}
          totalPago={totalPago}
          mensalidadeValor={mensalidadeValor}
          prox={prox}
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
          taxaPorPedido={Number((loja as any).taxa_por_pedido ?? 0)}
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
        />
      </div>

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
