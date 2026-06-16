import { UserPlus } from "lucide-react";
import { useVincularEntregador } from "../hooks/use-vincular-entregador";

export function VincularEntregadorForm({
  lojaId,
  onDone,
}: {
  lojaId: string;
  onDone: () => void;
}) {
  const { termo, setTermo, adding, submit } = useVincularEntregador(lojaId, onDone);

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card mb-6">
      <h2 className="font-display text-2xl tracking-wide mb-1">Vincular entregador</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Informe o <strong>telefone com DDD</strong> de um entregador já cadastrado
        (ex.: 11912345678).
      </p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Telefone com DDD"
          required
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          className="flex-1 bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={adding}
          className="px-6 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {adding ? "..." : "Vincular"}
        </button>
      </form>
    </div>
  );
}
