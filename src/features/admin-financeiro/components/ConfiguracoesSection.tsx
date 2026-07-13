import { Loader2, RefreshCw, Save } from "lucide-react";
import type { ConfigFinanceiro } from "../logic/types";

export function ConfiguracoesSection({
  config,
  setConfig,
  saving,
  gerando,
  onSalvar,
  onGerarMensalidades,
}: {
  config: ConfigFinanceiro;
  setConfig: (updater: (c: ConfigFinanceiro) => ConfigFinanceiro) => void;
  saving: boolean;
  gerando: boolean;
  onSalvar: () => void;
  onGerarMensalidades: () => void;
}) {
  const upd = (patch: Partial<ConfigFinanceiro>) =>
    setConfig((c) => ({ ...c, ...patch }));

  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-display text-xl mb-1">Configurações financeiras</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Defina os valores padrão cobrados das lojas. A mensalidade pode ser personalizada por loja na aba{" "}
        <strong>Lojas</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prazo p/ pagamento (dias)
          </span>
          <input
            type="number"
            min={1}
            step="1"
            value={config.prazo}
            onChange={(e) => upd({ prazo: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
          <span className="text-[10px] text-muted-foreground">Aplicado a cada cobrança gerada</span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Mensalidade padrão (R$)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={config.mensalidadePadrao}
            onChange={(e) => upd({ mensalidadePadrao: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
          <span className="text-[10px] text-muted-foreground">
            Usado quando a loja não tem valor próprio
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dia de vencimento padrão
          </span>
          <input
            type="number"
            min={1}
            max={28}
            step="1"
            value={config.diaVenc}
            onChange={(e) => upd({ diaVenc: Number(e.target.value) })}
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
          <span className="text-[10px] text-muted-foreground">Entre 1 e 28</span>
        </label>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="font-display text-lg mb-1">Saque do entregador</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha se o saque é liberado em um dia fixo da semana ou sempre que o saldo atingir um valor mínimo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Modo de liberação
            </span>
            <select
              value={config.saqueModo}
              onChange={(e) => upd({ saqueModo: e.target.value as "dia_semana" | "valor" })}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
            >
              <option value="dia_semana">Dia da semana fixo</option>
              <option value="valor">Por valor mínimo (qualquer dia)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Valor mínimo de saque (R$)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={config.saqueValorMinimo}
              onChange={(e) => upd({ saqueValorMinimo: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
            />
            <span className="text-[10px] text-muted-foreground">
              Aplicado nos dois modos
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Dia da semana
            </span>
            <select
              value={config.saqueDiaSemana}
              onChange={(e) => upd({ saqueDiaSemana: Number(e.target.value) })}
              disabled={config.saqueModo !== "dia_semana"}
              className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm disabled:opacity-50"
            >
              <option value={0}>Domingo</option>
              <option value={1}>Segunda-feira</option>
              <option value={2}>Terça-feira</option>
              <option value={3}>Quarta-feira</option>
              <option value={4}>Quinta-feira</option>
              <option value={5}>Sexta-feira</option>
              <option value={6}>Sábado</option>
            </select>
            <span className="text-[10px] text-muted-foreground">
              Usado apenas no modo "dia da semana"
            </span>
          </label>
        </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={onSalvar}
          disabled={saving}
          className="px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
        <button
          onClick={onGerarMensalidades}
          disabled={gerando}
          className="px-4 py-2.5 bg-card border border-border text-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:bg-background disabled:opacity-50 flex items-center gap-2"
        >
          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Gerar
          mensalidades deste mês
        </button>
      </div>
    </section>
  );
}
