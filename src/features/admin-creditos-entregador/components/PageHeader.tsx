import { Wallet } from "lucide-react";

export function PageHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center">
        <Wallet className="h-5 w-5 text-white/80" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-white">Mensalidade e créditos</h1>
        <p className="text-sm text-white/50">Configure a cobrança recorrente dos entregadores</p>
      </div>
    </div>
  );
}
