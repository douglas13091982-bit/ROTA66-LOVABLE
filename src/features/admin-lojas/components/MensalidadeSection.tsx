import { Save } from "lucide-react";

type Props = {
  valor: string;
  diaVenc: string;
  saving: boolean;
  onValorChange: (v: string) => void;
  onDiaVencChange: (v: string) => void;
  onSalvar: () => void;
};

export function MensalidadeSection({
  valor,
  diaVenc,
  saving,
  onValorChange,
  onDiaVencChange,
  onSalvar,
}: Props) {
  return (
    <section className="border-t border-border pt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Mensalidade desta loja
      </h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="block">
          <span className="text-[10px] text-muted-foreground">Valor (R$)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="padrão"
            value={valor}
            onChange={(e) => onValorChange(e.target.value)}
            className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-muted-foreground">Vencimento (dia)</span>
          <input
            type="number"
            min={1}
            max={28}
            step="1"
            placeholder="padrão"
            value={diaVenc}
            onChange={(e) => onDiaVencChange(e.target.value)}
            className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
          />
        </label>
      </div>
      <button
        onClick={onSalvar}
        disabled={saving}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold uppercase rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40"
      >
        <Save className="h-3 w-3" /> {saving ? "Salvando..." : "Salvar mensalidade"}
      </button>
      <p className="text-[10px] text-muted-foreground mt-1">
        Em branco = usa o valor padrão global.
      </p>
    </section>
  );
}
