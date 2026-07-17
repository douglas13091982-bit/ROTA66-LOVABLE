import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { ConfirmarCodigoDialog } from "@/components/ConfirmarCodigoDialog";
import { COLUMNS } from "./logic/constants";
import { montarLotesEmPreparo } from "./logic/agrupador";
import {
  usePedidosLoja,
  useChatMensagensEntregador,
  useAutoArquivar,
  useRaioAgrupamentoKm,
  useSyncedRef,
  type Pedido,
} from "./hooks/use-pedidos-loja";
import { usePedidoActions } from "./hooks/use-pedido-actions";
import { PedidosToolbar } from "./components/PedidosToolbar";
import { PedidosKanban, PedidosVazio } from "./components/PedidosKanban";
import { PedidoDrawer } from "./components/PedidoDrawer";

type ConfirmarState = { id: string; numero: number; tipo: "coleta" | "entrega" };

export function PedidosPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();

  const [confirmar, setConfirmar] = useState<ConfirmarState | null>(null);
  const [detalhe, setDetalhe] = useState<Pedido | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const { data: pedidos, isLoading } = usePedidosLoja(loja?.id);
  const pedidosRef = useSyncedRef<Pedido[]>(pedidos ?? []);
  const detalheIdRef = useSyncedRef<string | null>(detalhe?.id ?? null);

  
  useChatMensagensEntregador({
    lojaId: loja?.id,
    pedidos,
    detalheIdRef,
    pedidosRef,
    onAbrir: setDetalhe,
  });
  useAutoArquivar(loja?.id, pedidos, pedidosRef);

  const actions = usePedidoActions(loja?.id);
  const raioAgrupamentoKm = useRaioAgrupamentoKm();

  const grouped = useMemo(() => {
    const map: Record<string, Pedido[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    (pedidos ?? []).forEach((p) => {
      // Arquivados (incluindo cancelados) ficam ocultos até ativar "Mostrar arquivados".
      if (p.arquivado && !mostrarArquivados) return;
      const col = COLUMNS.find((c) => c.statuses.includes(p.status));
      if (col) map[col.key].push(p);
    });
    return map;
  }, [pedidos, mostrarArquivados]);

  const lotesEmPreparo = useMemo(
    () => montarLotesEmPreparo(grouped.preparacao ?? [], raioAgrupamentoKm),
    [grouped, raioAgrupamentoKm],
  );

  if (!loja) {
    return (
      <LojaShell title="Pedidos">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Pedidos">
      <PedidosToolbar
        slug={loja.slug}
        mostrarArquivados={mostrarArquivados}
        onToggleArquivados={() => setMostrarArquivados((v) => !v)}
      />

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {pedidos && pedidos.length === 0 && <PedidosVazio />}

      {pedidos && pedidos.length > 0 && (
        <PedidosKanban
          pedidos={pedidos}
          grouped={grouped}
          lotesEmPreparo={lotesEmPreparo}
          actions={actions}
          onOpenDetalhe={setDetalhe}
          onConfirmarColeta={(p) =>
            setConfirmar({ id: p.id, numero: p.numero, tipo: "coleta" })
          }
        />
      )}

      <PedidoDrawer
        detalhe={detalhe}
        lojaNome={loja.nome}
        actions={actions}
        onClose={() => setDetalhe(null)}
        onConfirmarColeta={(p) =>
          setConfirmar({ id: p.id, numero: p.numero, tipo: "coleta" })
        }
        onUpdateDetalhe={setDetalhe}
      />

      {confirmar && (
        <ConfirmarCodigoDialog
          open={!!confirmar}
          onOpenChange={(o) => {
            if (!o) setConfirmar(null);
          }}
          pedidoId={confirmar.id}
          pedidoNumero={confirmar.numero}
          tipo={confirmar.tipo}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["pedidos", loja.id] })}
        />
      )}
    </LojaShell>
  );
}
