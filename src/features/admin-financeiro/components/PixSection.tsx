import { Loader2, Save } from "lucide-react";
import type { ConfigFinanceiro } from "../logic/types";

export function PixSection({
  config,
  setConfig,
  saving,
  onSalvar,
}: {
  config: ConfigFinanceiro;
  setConfig: (updater: (c: ConfigFinanceiro) => ConfigFinanceiro) => void;
  saving: boolean;
  onSalvar: () => void;
}) {
  const upd = (patch: Partial<ConfigFinanceiro>) =>
    setConfig((c) => ({ ...c, ...patch }));

  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-display text-xl mb-1">PIX do sistema</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Chave que as lojas vão usar para pagar mensalidades e taxas. Um QR Code com valor já embutido é
        gerado automaticamente para cada cobrança.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</span>
          <input
            type="text"
            value={config.pixChave}
            onChange={(e) => upd({ pixChave: e.target.value })}
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titular</span>
          <input
            type="text"
            value={config.pixTitular}
            onChange={(e) => upd({ pixTitular: e.target.value })}
            placeholder="Nome do recebedor"
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cidade</span>
          <input
            type="text"
            value={config.pixCidade}
            onChange={(e) => upd({ pixCidade: e.target.value })}
            placeholder="BRASIL"
            className="mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
          />
        </label>
      </div>
      <div className="mt-4">
        <button
          onClick={onSalvar}
          disabled={saving}
          className="px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar PIX
        </button>
      </div>
    </section>
  );
}
