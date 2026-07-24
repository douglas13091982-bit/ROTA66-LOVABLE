import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Info,
  KeyRound,
  Loader2,
  Map as MapIcon,
  MapPin,
  Phone,
  User,
  Wallet,
  Route as RouteIcon,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ChatPedidoButton } from "@/components/ChatPedido";
import { formatDateTime } from "@/lib/format";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { supabase } from "@/integrations/supabase/client";
import type { PedidoAtivo } from "../logic/types";
import { useConfirmarEntrega } from "../hooks/use-confirmar-entrega";
import { abrirRetornoLoja } from "./RetornoLojaDialog";

type Props = {
  pedido: PedidoAtivo;
  destaque?: string;
  agrupado?: boolean;
};

// Countdown mm:ss até o deadline; retorna null quando não há deadline
function useCountdown(deadline?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return { text: null as string | null, late: false };
  const diff = new Date(deadline).getTime() - now;
  const late = diff <= 0;
  const s = Math.max(0, Math.floor(diff / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return { text: `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`, late };
}

function formaPagamentoLabel(f?: string | null) {
  const v = (f ?? "").toLowerCase();
  if (v === "dinheiro") return "Dinheiro";
  if (v === "pix") return "PIX";
  if (v.startsWith("cartao")) return "Cartão";
  if (v === "online" || v === "mercadopago" || v === "mp") return "Online";
  return f ?? "—";
}

export function PedidoCard({ pedido: p, destaque, agrupado }: Props) {
  const [revealedColeta, setRevealedColeta] = useState(false);
  const [revealedEntrega, setRevealedEntrega] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const { confirmar, loading, refresh } = useConfirmarEntrega(p.id);
  const taxaLoja = Number(p.loja_taxa_por_pedido ?? 0);

  const isColeta = p.status === "em_rota";
  const endereco = isColeta ? p.endereco_coleta : p.endereco_entrega;
  const codigoColeta = p.codigo_coleta;
  const isDestaque = destaque === p.id;
  const cardRef = useRef<HTMLDivElement>(null);
  const isCartao = ["cartao", "cartao_credito", "cartao_debito"].includes(
    (p.forma_pagamento ?? "").toLowerCase(),
  );

  const liquido = liquidoEntregador(
    p.taxa_entrega,
    taxaLoja,
    p.loja_plano_mensal_ativo,
    p.forma_pagamento,
  );
  const distanciaKm =
    p.distancia_metros != null ? p.distancia_metros / 1000 : null;
  const valorPorKm =
    distanciaKm && distanciaKm > 0 ? liquido / distanciaKm : null;

  const countdown = useCountdown(isColeta ? p.deadline_coleta_at : null);

  useEffect(() => {
    if (isDestaque && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isDestaque]);

  async function onChange(v: string) {
    setCodigoInput(v);
    if (v.length === 4) {
      const ok = await confirmar(v);
      if (!ok) {
        setCodigoInput("");
        return;
      }
      if (isCartao && p.endereco_coleta) {
        abrirRetornoLoja(p.endereco_coleta, p.id, p.numero);
      }
      refresh();
    }
  }

  // Paleta fixa Rota 66
  const RED = "#C91C1C";
  const NAVY = "#0D2B45";
  const MUTED = "#8FA3B8";
  const DIVIDER = "rgba(255,255,255,0.08)";

  const stagePillLabel = isColeta ? "INDO BUSCAR" : "EM ENTREGA";
  const stagePillColor = isColeta ? "#F5B301" : "#7DD3FC";

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-[22px] p-4 sm:p-6 md:p-7 transition-all duration-500 ${
        isDestaque ? "ring-4 ring-white/20" : ""
      }`}
      style={{
        background: NAVY,
        boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header: número + timer */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: MUTED }}
          >
            Pedido
          </div>
          <div className="font-display text-4xl sm:text-5xl md:text-6xl leading-none text-white mt-1 truncate">
            #{p.numero}
          </div>
          <div className="text-[11px] mt-2" style={{ color: MUTED }}>
            {formatDateTime(p.updated_at)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 min-w-0 max-w-[45%]">
          {isColeta && countdown.text ? (
            <>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.16em] truncate max-w-full"
                style={{ color: MUTED }}
              >
                Tempo para chegar
              </div>
              <div
                className={`font-display leading-none tabular-nums truncate max-w-full ${
                  countdown.late ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl md:text-5xl"
                }`}
                style={{ color: RED }}
              >
                {countdown.late ? "ATRASADO" : countdown.text}
              </div>
            </>
          ) : (
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: MUTED }}
            >
              {isColeta ? "Coleta" : "Entrega"}
            </div>
          )}
          <span
            className="mt-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] rounded-full border whitespace-nowrap"
            style={{ color: stagePillColor, borderColor: stagePillColor }}
          >
            {stagePillLabel}
          </span>
        </div>
      </div>

      <div className="my-4 sm:my-5 h-px" style={{ background: DIVIDER }} />

      {/* Cliente / Loja */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-full border flex items-center justify-center shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <User className="h-5 w-5" style={{ color: RED }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-base truncate">
            {p.cliente_nome}
          </div>
          {p.cliente_telefone && (
            <a
              href={`tel:${p.cliente_telefone}`}
              className="inline-flex items-center gap-1.5 font-semibold text-[13px] mt-0.5 truncate max-w-full"
              style={{ color: RED }}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{p.cliente_telefone}</span>
            </a>
          )}
        </div>
        <div className="shrink-0">
          <ChatPedidoButton
            pedidoId={p.id}
            pedidoNumero={Number(p.numero)}
            senderRole="entregador"
            contraparteNome="Loja"
          />
        </div>
      </div>



      <div className="my-5 h-px" style={{ background: DIVIDER }} />

      {/* Endereço */}
      <div>
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3"
          style={{ color: MUTED }}
        >
          {isColeta ? "Endereço de coleta" : "Endereço de entrega"}
        </div>
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-full border flex items-center justify-center shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            <MapPin className="h-5 w-5" style={{ color: RED }} />
          </div>
          <div className="flex-1 min-w-0 text-white text-[15px] leading-snug font-medium">
            {endereco}
            {!isColeta && p.complemento ? `, ${p.complemento}` : ""}
          </div>
          {endereco && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`}
              aria-label="Abrir rota no mapa"
              className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border transition-all active:scale-95"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                color: MUTED,
              }}
            >
              <MapIcon className="h-5 w-5" style={{ color: RED }} />
              <span className="text-[10px] font-bold tracking-[0.14em] mt-1 text-white/80">
                MAPA
              </span>
            </a>
          )}
        </div>
      </div>

      {!agrupado && (
        <>
          <div className="my-5 h-px" style={{ background: DIVIDER }} />

          {/* Você recebe */}
          <div className="text-center py-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: MUTED }}
            >
              Você recebe
            </div>
            <div className="font-display text-6xl md:text-7xl leading-none mt-2 text-emerald-400 tabular-nums">
              R$ {liquido.toFixed(2).replace(".", ",")}
            </div>
            {Number(p.bonus_entregador ?? 0) > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 text-emerald-300 text-xs font-bold uppercase tracking-[0.14em] rounded-full">
                <TrendingUp className="h-4 w-4" />
                +R$ {Number(p.bonus_entregador).toFixed(2)} bônus
              </div>
            )}
          </div>

          {/* Stats card */}
          <div
            className="mt-5 rounded-2xl border grid grid-cols-3"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Stat
              icon={<Wallet className="h-5 w-5" style={{ color: RED }} />}
              label="Pagamento"
              value={formaPagamentoLabel(p.forma_pagamento)}
            />
            <Stat
              icon={<RouteIcon className="h-5 w-5" style={{ color: RED }} />}
              label="Distância"
              value={distanciaKm != null ? `${distanciaKm.toFixed(1)} km` : "—"}
              withBorder
            />
            <Stat
              icon={<DollarSign className="h-5 w-5" style={{ color: RED }} />}
              label="Valor/km"
              value={
                valorPorKm != null
                  ? `R$ ${valorPorKm.toFixed(2).replace(".", ",")}`
                  : "—"
              }
              withBorder
            />
          </div>
        </>
      )}

      {/* Info banner */}
      {isColeta && !revealedColeta && (
        <div
          className="mt-5 rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Info className="h-4 w-4 text-white/80" />
          </div>
          <p className="text-sm leading-snug" style={{ color: "#CBD5E1" }}>
            Assim que você chegar ao local, clique em{" "}
            <b style={{ color: "#F5B301" }}>CHEGUEI NA COLETA.</b>
          </p>
        </div>
      )}

      {!isColeta && !revealedEntrega && (
        <div
          className="mt-5 rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Info className="h-4 w-4 text-white/80" />
          </div>
          <p className="text-sm leading-snug" style={{ color: "#CBD5E1" }}>
            Ao chegar no cliente, clique em{" "}
            <b style={{ color: "#7DD3FC" }}>CHEGUEI NA ENTREGA.</b>
          </p>
        </div>
      )}

      {/* CTA / Estados */}
      <div className="mt-5">
        {isColeta ? (
          !revealedColeta ? (
            <CtaButton
              onClick={() => {
                setRevealedColeta(true);
                void supabase.rpc("entregador_chegou_coleta" as never, {
                  _pedido_id: p.id,
                } as never);
              }}
            >
              Cheguei na coleta
            </CtaButton>
          ) : (
            <div
              className="rounded-2xl border p-5 text-center"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] mb-2 font-bold"
                style={{ color: MUTED }}
              >
                <KeyRound className="h-3.5 w-3.5" /> Código de coleta
              </div>
              <div
                className="font-display text-6xl tracking-[0.4em] mb-2 select-all"
                style={{ color: RED }}
              >
                {codigoColeta}
              </div>
              <p className="text-[12px]" style={{ color: MUTED }}>
                Mostre este código para a loja confirmar a coleta.
              </p>
            </div>
          )
        ) : !revealedEntrega ? (
          <CtaButton onClick={() => setRevealedEntrega(true)}>
            Cheguei na entrega
          </CtaButton>
        ) : p.origem === "ifood" ? (
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.18em] mb-2">
                Pedido iFood
              </div>
              <p className="text-xs" style={{ color: MUTED }}>
                Confirme a entrega pelo link do iFood e depois toque em{" "}
                <b className="text-white">Finalizar entrega</b>.
              </p>
            </div>
            <a
              href="https://confirmacao-entrega-propria.ifood.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-[0.18em] rounded-xl"
            >
              Abrir confirmação iFood
            </a>
            <button
              disabled={loading}
              onClick={async () => {
                const ok = await confirmar("");
                if (!ok) return;
                if (isCartao && p.endereco_coleta) {
                  abrirRetornoLoja(p.endereco_coleta, p.id, p.numero);
                }
                refresh();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-[0.18em] rounded-xl disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finalizando...
                </>
              ) : (
                "Finalizar entrega"
              )}
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold"
              style={{ color: MUTED }}
            >
              <KeyRound className="h-3.5 w-3.5" /> Digite o código do cliente
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={codigoInput}
                onChange={onChange}
                disabled={loading}
                inputMode="numeric"
                pattern="[0-9]*"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={1} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={2} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={3} className="h-14 w-12 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {loading && (
              <div
                className="flex items-center justify-center gap-2 text-xs"
                style={{ color: MUTED }}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirmando...
              </div>
            )}
            <p
              className="text-[12px] text-center"
              style={{ color: MUTED }}
            >
              Peça ao cliente o código de 4 dígitos da página de rastreio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  withBorder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  withBorder?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-4 px-2 ${
        withBorder ? "border-l" : ""
      }`}
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      {icon}
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-2"
        style={{ color: "#8FA3B8" }}
      >
        {label}
      </div>
      <div className="text-white font-semibold text-[15px] mt-1 truncate max-w-full">
        {value}
      </div>
    </div>
  );
}

function CtaButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl font-bold uppercase text-[15px] tracking-[0.16em] text-white transition-all active:scale-[0.98]"
      style={{
        background: "#C91C1C",
        boxShadow: "0 14px 32px -10px rgba(201,28,28,0.55)",
      }}
    >
      <span>{children}</span>
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
