import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Package, Route as RouteIcon } from "lucide-react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { AnunciosEntregador } from "@/components/AnunciosEntregador";
import { GanhoHojeCard } from "@/components/entregador/GanhoHojeCard";
import { PedidoListItem } from "@/components/entregador/PedidoListItem";
import { useTaxaSistema } from "@/hooks/use-taxa-sistema";
import { useGeolocalizacao } from "@/hooks/use-geolocalizacao";
import { usePedidosDisponiveis } from "@/hooks/use-pedidos-disponiveis";
import { useAcoesPedido } from "@/hooks/use-acoes-pedido";

export const Route = createFileRoute("/_authenticated/entregador/disponiveis")({
  component: DisponiveisPage,
});

function DisponiveisPage() {
  const navigate = useNavigate();
  const taxaSistema = useTaxaSistema();
  const { posicao: minhaPos } = useGeolocalizacao();
  const { dismissed, aceitarGrupo } = useAcoesPedido();
  const {
    grupos,
    isLoading,
    temRotaAtiva,
    semVinculoNemExterno,
    ganhoHoje,
    taxaParaExibir,
  } = usePedidosDisponiveis(dismissed);

  if (semVinculoNemExterno) {
    return (
      <EntregadorShell title="Disponíveis">
        <SemVinculoEstado />
      </EntregadorShell>
    );
  }

  return (
    <EntregadorShell title="Rotas Disponíveis">
      <GanhoHojeCard valor={ganhoHoje} />

      {temRotaAtiva ? (
        <RotaAtivaEstado onVerRota={() => navigate({ to: "/entregador/ativos" })} />
      ) : (
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Rotas Disponíveis</h2>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "oklch(0.72 0.18 27)" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.22 27)" }} />
              Em tempo real
            </div>
          </div>

          {isLoading && grupos.length === 0 && (
            <p className="text-white/45 text-sm px-1">Carregando pedidos...</p>
          )}

          {!isLoading && grupos.length === 0 && (
            <div className="text-center py-10 px-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <Package className="h-10 w-10 text-white/30 mx-auto mb-3" />
              <p className="text-white/55 text-sm">Nenhum pedido disponível no momento.</p>
              <p className="text-white/35 text-xs mt-1">Assim que uma loja liberar, aparece aqui.</p>
            </div>
          )}

          {grupos.map((grupo) => (
            <PedidoListItem
              key={grupo.key}
              grupo={grupo}
              minhaPos={minhaPos}
              taxaSistema={taxaSistema}
              taxaParaExibir={taxaParaExibir}
              onAceitar={() => aceitarGrupo(grupo.items)}
            />
          ))}
        </div>
      )}

      <AnunciosEntregador />
    </EntregadorShell>
  );
}


function SemVinculoEstado() {
  return (
    <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="font-display text-2xl tracking-wide mb-2">
        Você ainda não está vinculado a nenhuma loja
      </p>
      <p className="text-muted-foreground text-sm mb-4">
        Peça à loja para te vincular como entregador no painel dela. Assim que vincular,
        os pedidos prontos aparecem aqui em tempo real.
      </p>
      <p className="text-muted-foreground text-sm">
        Ou ative em <strong>Perfil</strong> a opção{" "}
        <em>"Entregador externo"</em> para receber pedidos de lojas sem entregador próprio online.
      </p>
    </div>
  );
}

function RotaAtivaEstado({ onVerRota }: { onVerRota: () => void }) {
  return (
    <div className="text-center py-12">
      <RouteIcon className="h-16 w-16 text-white/80 mx-auto mb-4" />
      <p className="font-display text-2xl tracking-wide mb-2 text-white">Você já tem uma rota ativa</p>
      <p className="text-white/60 text-sm mb-6">
        Finalize a rota atual para receber novos pedidos.
      </p>
      <button
        onClick={onVerRota}
        className="px-5 py-2.5 bg-[#da161a] text-white font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 transition-opacity"
      >
        Ver minha rota
      </button>
    </div>
  );
}
