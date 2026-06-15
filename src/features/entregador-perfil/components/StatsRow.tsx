import { StatCell } from "./ui-atoms";

type Props = {
  entregas: number;
  tempo: string;
};

export function StatsRow({ entregas, tempo }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 px-2 pb-4 border-b border-white/8">
      <StatCell value="5.0" label="Avaliação" accent />
      <StatCell value={entregas.toLocaleString("pt-BR")} label="Pedidos" />
      <StatCell value={tempo} label="Tempo" />
    </div>
  );
}
