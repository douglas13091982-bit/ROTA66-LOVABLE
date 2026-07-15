import { useState } from "react";
import {
  Receipt,
  Tags,
  ShoppingBag,
  TrendingUp,
  Bike,
  Info,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useFranquia } from "@/hooks/use-franquia";
import {
  useFaturamentoSistema,
  type PeriodoFat,
} from "./hooks/use-faturamento-sistema";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIODOS: { key: PeriodoFat; label: string }[] = [
  { key: "mes_atual", label: "Mês atual" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "tudo", label: "Todo período" },
];

function Card({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  children,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: any;
  tone?: "default" | "success" | "warn" | "primary";
  children?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-card border-border",
    success: "bg-emerald-500/5 border-emerald-500/30",
    warn: "bg-yellow-500/5 border-yellow-500/30",
    primary: "bg-primary/5 border-primary/40",
  };
  const iconTone: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/15 text-emerald-500",
    warn: "bg-yellow-500/15 text-yellow-500",
    primary: "bg-primary/15 text-primary",
  };
  return (
    <div className={`rounded-lg border p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${iconTone[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
            {title}
          </div>
          <div className="font-display text-2xl mt-1">{value}</div>
          {hint && (
            <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function FaturamentoSistemaPage() {
  const [periodo, setPeriodo] = useState<PeriodoFat>("mes_atual");
  const { isFranqueado, cidade } = useFranquia();
  const cidadeFiltro = isFranqueado ? cidade ?? null : null;
  const { data, isLoading } = useFaturamentoSistema(periodo, cidadeFiltro);

  const receita = data?.liquidoSistema ?? 0;
  const mens = data?.mensalidadesPagas ?? 0;
  const taxas = data?.taxasPorPedido ?? 0;
  const vBrut = data?.vendasBrutas ?? 0;
  const vTaxaMp = data?.taxasMp ?? 0;
  const vLiq = data?.vendasLiquidas ?? 0;
  const rep = data?.repassesEntregadores ?? 0;

  return (
    <AdminShell title="Faturamento do sistema">
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {PERIODOS.map((p) => {
            const active = periodo === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-gradient-red shadow-red text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        )}

        {/* SEÇÃO 1: RECEITA DO SISTEMA */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Receita do sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              title="Mensalidades pagas (planos)"
              value={brl(mens)}
              hint={`${data?.mensalidadesQtd ?? 0} mensalidade(s) quitada(s)`}
              icon={Receipt}
              tone="success"
            />
            <Card
              title="Taxas por pedido"
              value={brl(taxas)}
              hint={`${data?.taxasPorPedidoQtd ?? 0} pedido(s) com taxa aplicada`}
              icon={Tags}
              tone="success"
            />
            <Card
              title="Líquido do sistema"
              value={brl(receita)}
              hint="Mensalidades + taxas por pedido"
              icon={TrendingUp}
              tone="primary"
            />
          </div>
        </section>

        {/* SEÇÃO 2: SALDO DE VENDAS DAS LOJAS */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Vendas das lojas (Mercado Pago)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              title="Vendas brutas"
              value={brl(vBrut)}
              hint={`${data?.vendasQtd ?? 0} pedido(s) pagos via MP`}
              icon={ShoppingBag}
            />
            <Card
              title="Taxas do Mercado Pago"
              value={`− ${brl(vTaxaMp)}`}
              hint="Descontadas do saldo da loja"
              icon={Tags}
              tone="warn"
            />
            <Card
              title="Saldo líquido das lojas"
              value={brl(vLiq)}
              hint="Valor que ficou disponível para as lojas"
              icon={ShoppingBag}
              tone="success"
            />
          </div>
          <Card
            title="Saldo atual consolidado das lojas (real)"
            value={brl(data?.saldoAtualLojas ?? 0)}
            hint="Soma dos saldos de todas as carteiras agora, já líquido de: entregas pagas aos entregadores, taxa por pedido, taxa MP, mensalidades e saques."
            icon={Wallet}
            tone="primary"
          />
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Este saldo pertence às lojas — não é receita do sistema. Fica
              disponível para elas sacarem semanalmente.
            </span>
          </div>
        </section>


        {/* SEÇÃO 3: REPASSES */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Repasses aos entregadores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title="Saques pendentes (a pagar agora)"
              value={brl(data?.repassesPendentes ?? 0)}
              hint={`${data?.repassesPendentesQtd ?? 0} solicitação(ões) aguardando pagamento`}
              icon={AlertCircle}
              tone="warn"
            />
            <Card
              title="Saldo total devido aos entregadores"
              value={brl(data?.saldoDevidoEntregadores ?? 0)}
              hint="Créditos acumulados nas carteiras dos entregadores (ainda não sacados)"
              icon={Wallet}
              tone="primary"
            />
            <Card
              title="Total pago em saques (período)"
              value={brl(rep)}
              hint={`${data?.repassesQtd ?? 0} saque(s) liquidados`}
              icon={Bike}
              tone="success"
            />
            <Card
              title="Como funciona"
              value=""
              hint="Cada entrega é debitada do saldo da loja e creditada ao entregador. O sistema apenas intermedeia — não é receita nem despesa da plataforma."
              icon={Info}
            />
          </div>
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-xs flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              O card "Saques pendentes" mostra o valor total das solicitações
              em aberto — é o que você precisa pagar via PIX aos entregadores.
              Acesse <strong>Carteiras &amp; Saques</strong> para liquidar.
            </span>
          </div>
        </section>


        {/* SEÇÃO 4: RESUMO FINAL */}
        <section className="rounded-lg border border-primary/40 bg-primary/5 p-6">
          <div className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
            Valor líquido do sistema no período
          </div>
          <div className="font-display text-4xl text-primary mt-2">
            {brl(receita)}
          </div>
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <div>
              = <strong>{brl(mens)}</strong> mensalidades +{" "}
              <strong>{brl(taxas)}</strong> taxas por pedido
            </div>
            <div>
              Excluídos: {brl(vLiq)} de vendas (lojas) e {brl(rep)} de repasses
              (entregadores).
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
