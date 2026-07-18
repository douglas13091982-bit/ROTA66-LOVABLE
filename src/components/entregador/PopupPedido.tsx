import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { LatLng } from "@/lib/geo";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";
import { PedidoCardDisponivel } from "./PedidoCardDisponivel";
import { RotaCardDisponivel } from "./RotaCardDisponivel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: GrupoPedido | null;
  minhaPos: LatLng | null;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  nowMs: number;
  onAceitar: (items: PedidoDisponivel[]) => void;
  onRecusar: (key: string, items: PedidoDisponivel[]) => void;
};

export function PopupPedido({
  open,
  onOpenChange,
  grupo,
  minhaPos,
  taxaParaExibir,
  nowMs,
  onAceitar,
  onRecusar,
}: Props) {
  return (
    <Dialog open={open && !!grupo} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="panel-premium fixed inset-0 z-50 m-auto flex h-fit flex-col gap-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl p-0 outline-none"
          style={{
            inset: 0,
            margin: "auto",
            translate: "none",
            transform: "none",
            width: "calc(100svw - 1rem)",
            maxWidth: "min(42rem, calc(100svw - 1rem))",
            maxHeight: "calc(100svh - 1rem)",
            background: "oklch(0.12 0.015 260)",
            border: "1px solid oklch(0.78 0.16 75 / 0.40)",
            boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.65), 0 0 0 1px oklch(0.78 0.16 75 / 0.08)",
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>Novo pedido disponível</DialogTitle>
          </VisuallyHidden>
          {grupo && !grupo.isRota && (
            <PedidoCardDisponivel
              pedido={grupo.items[0]}
              minhaPos={minhaPos}
              taxaParaExibir={taxaParaExibir}
              nowMs={nowMs}
              onAceitar={() => onAceitar(grupo.items)}
              onRecusar={() => onRecusar(grupo.key, grupo.items)}
            />
          )}
          {grupo && grupo.isRota && (
            <RotaCardDisponivel
              grupo={grupo}
              minhaPos={minhaPos}
              taxaParaExibir={taxaParaExibir}
              nowMs={nowMs}
              onAceitar={() => onAceitar(grupo.items)}
              onRecusar={() => onRecusar(grupo.key, grupo.items)}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
