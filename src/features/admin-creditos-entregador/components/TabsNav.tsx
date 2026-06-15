import type { TabKey } from "../logic/types";

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ["config", "Configuração"],
  ["entregadores", "Entregadores"],
  ["transacoes", "Transações"],
];

export function TabsNav({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="flex gap-2 mb-5 border-b border-white/8">
      {TABS.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            tab === k ? "border-white text-white" : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
