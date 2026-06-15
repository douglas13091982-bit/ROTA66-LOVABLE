import { useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { PixPagamentoDialog } from "@/components/PixPagamentoDialog";
import { useFinanceiroLoja } from "./hooks/use-financeiro-loja";
import { calcularResumo } from "./logic/resumo";
import type { DialogState } from "./logic/types";
import { ResumoCards } from "./components/ResumoCards";
import { InfoPrazo } from "./components/InfoPrazo";
import { MensalidadesTabela } from "./components/MensalidadesTabela";
import { CobrancasTabela } from "./components/CobrancasTabela";

export function FinanceiroPage() {
  const { data: loja } = useMinhaLoja();
  const {
    cobrancas,
    mensalidades,
    loading,
    prazo,
    mensalidadeValor,
    pixCfg,
    marcarSolicitado,
  } = useFinanceiroLoja(loja);
  const [dialog, setDialog] = useState<DialogState>(null);

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
          pixHabilitado={pixHabilitado}
          onDialog={setDialog}
        />
        <CobrancasTabela
          loading={loading}
          cobrancas={cobrancas}
          cobAbertas={cobAbertas}
          cobAberto={cobAberto}
          pixHabilitado={pixHabilitado}
          onDialog={setDialog}
        />
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
