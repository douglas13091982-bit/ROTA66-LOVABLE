import { useState } from "react";
import { Bell, Settings, CreditCard, QrCode, Receipt, FileText, LayoutDashboard, Wallet } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminFinanceiro } from "./hooks/use-admin-financeiro";
import { PagamentosAguardando } from "./components/PagamentosAguardando";
import { ConfiguracoesSection } from "./components/ConfiguracoesSection";
import { PixSection } from "./components/PixSection";
import { MensalidadesSection } from "./components/MensalidadesSection";
import { CobrancasSection } from "./components/CobrancasSection";
import { MercadoPagoPlataformaSection } from "./components/MercadoPagoPlataformaSection";
import { CobrancasUnificadasSection } from "./components/CobrancasUnificadasSection";
import { SaldosLojasSection } from "./components/SaldosLojasSection";
import { useFranquia } from "@/hooks/use-franquia";

type TabKey =
  | "pendentes"
  | "visao-geral"
  | "saldos-lojas"
  | "config"
  | "mercado-pago"
  | "pix"
  | "mensalidades"
  | "cobrancas";

const ALL_TABS: { key: TabKey; label: string; Icon: typeof Settings }[] = [
  { key: "pendentes", label: "Pendentes", Icon: Bell },
  { key: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
  { key: "saldos-lojas", label: "Saldos das lojas", Icon: Wallet },
  { key: "config", label: "Configurações", Icon: Settings },
  { key: "mercado-pago", label: "Mercado Pago", Icon: CreditCard },
  { key: "pix", label: "PIX manual", Icon: QrCode },
  { key: "mensalidades", label: "Mensalidades", Icon: Receipt },
  { key: "cobrancas", label: "Cobranças", Icon: FileText },
];


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
  const totalPendentes = cobAguardando.length + mensAguardando.length;

  const { isFranqueado } = useFranquia();
  const TABS = ALL_TABS.filter((t) =>
    isFranqueado ? t.key !== "mercado-pago" && t.key !== "pix" : true,
  );

  const [tab, setTab] = useState<TabKey>("visao-geral");

  return (
    <AdminShell title="Financeiro">
      <div className="max-w-5xl space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            const showBadge = key === "pendentes" && totalPendentes > 0;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-gradient-red shadow-red text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {showBadge && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {totalPendentes}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        {tab === "pendentes" && (
          <PagamentosAguardando
            cobAguardando={cobAguardando}
            mensAguardando={mensAguardando}
            onMarcarCob={marcarCobrancaPaga}
            onMarcarMens={marcarMensalidadePaga}
            onQuitarVarias={quitarVarias}
          />
        )}

        {tab === "visao-geral" && <CobrancasUnificadasSection />}

        {tab === "saldos-lojas" && <SaldosLojasSection />}


        {tab === "config" && (
          <ConfiguracoesSection
            config={config}
            setConfig={setConfig}
            saving={saving}
            gerando={gerando}
            onSalvar={salvar}
            onGerarMensalidades={gerarMensalidades}
          />
        )}

        {tab === "mercado-pago" && <MercadoPagoPlataformaSection />}

        {tab === "pix" && (
          <PixSection
            config={config}
            setConfig={setConfig}
            saving={saving}
            onSalvar={salvar}
          />
        )}

        {tab === "mensalidades" && (
          <MensalidadesSection
            mensalidades={mensalidades}
            loading={loading}
            onMarcarPaga={marcarMensalidadePaga}
          />
        )}

        {tab === "cobrancas" && (
          <CobrancasSection
            cobrancas={cobrancas}
            loading={loading}
            onQuitarLoja={quitarCobrancasLoja}
          />
        )}
      </div>
    </AdminShell>
  );
}
