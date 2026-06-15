import { AdminShell } from "@/components/AdminShell";
import { useAdminFinanceiro } from "./hooks/use-admin-financeiro";
import { PagamentosAguardando } from "./components/PagamentosAguardando";
import { ConfiguracoesSection } from "./components/ConfiguracoesSection";
import { PixSection } from "./components/PixSection";
import { MensalidadesSection } from "./components/MensalidadesSection";
import { CobrancasSection } from "./components/CobrancasSection";
import { MercadoPagoPlataformaSection } from "./components/MercadoPagoPlataformaSection";

export function FinanceiroAdminPage() {
  const {
    config,
    setConfig,
    saving,
    gerando,
    loading,
    cobrancas,
    mensalidades,
    salvar,
    gerarMensalidades,
    quitarCobrancasLoja,
    marcarCobrancaPaga,
    marcarMensalidadePaga,
    quitarVarias,
  } = useAdminFinanceiro();

  const cobAguardando = cobrancas.filter((c) => !c.pago && !!c.pago_solicitado_em);
  const mensAguardando = mensalidades.filter((m) => !m.pago && !!m.pago_solicitado_em);

  return (
    <AdminShell title="Financeiro">
      <div className="space-y-6 max-w-5xl">
        <PagamentosAguardando
          cobAguardando={cobAguardando}
          mensAguardando={mensAguardando}
          onMarcarCob={marcarCobrancaPaga}
          onMarcarMens={marcarMensalidadePaga}
          onQuitarVarias={quitarVarias}
        />

        <ConfiguracoesSection
          config={config}
          setConfig={setConfig}
          saving={saving}
          gerando={gerando}
          onSalvar={salvar}
          onGerarMensalidades={gerarMensalidades}
        />

        <MercadoPagoPlataformaSection />

        <PixSection
          config={config}
          setConfig={setConfig}
          saving={saving}
          onSalvar={salvar}
        />


        <MensalidadesSection
          mensalidades={mensalidades}
          loading={loading}
          onMarcarPaga={marcarMensalidadePaga}
        />

        <CobrancasSection
          cobrancas={cobrancas}
          loading={loading}
          onQuitarLoja={quitarCobrancasLoja}
        />
      </div>
    </AdminShell>
  );
}
