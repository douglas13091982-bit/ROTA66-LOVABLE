import { TarifasLoja } from "./TarifasLoja";
import { Toggle } from "./Toggle";

type Props = {
  lojaId: string;
  planoAtivo: boolean;
  savingPlano: boolean;
  onToggle: () => void;
};

export function PlanoMensalSection({ lojaId, planoAtivo, savingPlano, onToggle }: Props) {
  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Plano mensal
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {planoAtivo
              ? "Isenta da taxa R$ de cada pedido · usa tarifas próprias"
              : "Cobra taxa por pedido + tarifas globais"}
          </p>
        </div>
        <Toggle ativo={planoAtivo} disabled={savingPlano} onClick={onToggle} />
      </div>
      {planoAtivo && <TarifasLoja lojaId={lojaId} />}
    </section>
  );
}
