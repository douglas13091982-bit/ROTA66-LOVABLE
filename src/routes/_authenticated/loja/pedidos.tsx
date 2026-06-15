import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { normalizarEndereco } from "@/lib/endereco";
import { haversineKm } from "@/lib/geo";
import { Phone, MapPin, Package, PlusCircle, KeyRound, User, Calendar, FileText, Archive, ArchiveRestore, EyeOff, Eye, Bike, MessageCircle, X, Layers, CheckCheck, Printer } from "lucide-react";
import { ConfirmarCodigoDialog } from "@/components/ConfirmarCodigoDialog";
import { EntregadorPixCard } from "@/components/EntregadorPixCard";
import { EntregadorNomeBadge } from "@/components/EntregadorNomeBadge";
import { ChatPedidoButton, PedidoChatBadge } from "@/components/ChatPedido";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/loja/pedidos")({
  component: PedidosPage,
});

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  aceito: "Aceito",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  em_rota: "Coletando",
  coletado: "Coletado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  novo: "bg-[oklch(0.55_0.26_25)] text-white",
  aceito: "bg-[oklch(0.35_0.06_265)] text-white",
  em_preparo: "bg-[oklch(0.55_0.16_75)] text-[#0e0f12]",
  pronto: "bg-[oklch(0.50_0.24_25)] text-white",
  em_rota: "bg-[oklch(0.40_0.06_265)] text-white",
  coletado: "bg-[oklch(0.45_0.06_265)] text-white",
  entregue: "bg-[oklch(0.38_0.06_165)] text-white",
  cancelado: "bg-zinc-600 text-white",
};

// A loja só controla o fluxo até "pronto". Depois disso quem avança é o entregador.
const NEXT: Record<string, string | null> = {
  novo: "pronto",
  aceito: "pronto",
  em_preparo: "pronto",
  pronto: null,
  em_rota: null,
  coletado: null,
  entregue: null,
  cancelado: null,
};

type ColumnDef = {
  key: string;
  title: string;
  statuses: string[];
  accent: string;
};

const COLUMNS: ColumnDef[] = [
  { key: "preparacao", title: "Preparação", statuses: ["novo", "aceito", "em_preparo"], accent: "border-t-[oklch(0.55_0.16_75)]" },
  { key: "pronto", title: "Pronto", statuses: ["pronto"], accent: "border-t-[oklch(0.55_0.26_25)]" },
  { key: "coletado", title: "Coletado", statuses: ["em_rota", "coletado"], accent: "border-t-[oklch(0.35_0.06_265)]" },
  { key: "entregue", title: "Entregue", statuses: ["entregue"], accent: "border-t-[oklch(0.38_0.06_165)]" },
];

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function imprimirPedido(p: any, lojaNome?: string) {
  if (!p) return;
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const valorProdutos = Number(
    p.valor_produtos ?? (Number(p.valor_total) - Number(p.taxa_entrega ?? 0)),
  );
  const taxa = Number(p.taxa_entrega ?? 0) - Number(p.bonus_entregador ?? 0);
  const bonus = Number(p.bonus_entregador ?? 0);
  const total = Number(p.valor_total ?? 0);
  const linhasItens = itens
    .map(
      (it: any) => `
        <tr>
          <td>${escapeHtml(it.qtd ?? it.quantidade ?? 1)}x</td>
          <td>${escapeHtml(it.nome ?? "")}</td>
          <td style="text-align:right">R$ ${Number(it.preco ?? 0).toFixed(2)}</td>
          <td style="text-align:right">R$ ${(Number(it.qtd ?? it.quantidade ?? 1) * Number(it.preco ?? 0)).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  const pedidoUrl = `${window.location.origin}/rastreio/${p.id}`;
  let qrImg = "";
  try {
    const qrDataUrl = await QRCode.toDataURL(pedidoUrl, { width: 200, margin: 2 });
    qrImg = `<div style="text-align:center;margin-top:12px;">
      <img src="${qrDataUrl}" style="width:140px;height:140px;display:block;margin:0 auto;" alt="QR Code" />
      <div class="muted" style="margin-top:4px;font-size:10px;">Escaneie para rastreio/conferência</div>
    </div>`;
  } catch {
    qrImg = `<div class="muted" style="text-align:center;margin-top:12px;">[QR Code indisponível]</div>`;
  }

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido #${escapeHtml(p.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #000; padding: 16px; max-width: 80mm; margin: 0 auto; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
  h2 { font-size: 13px; margin: 12px 0 4px; border-bottom: 1px dashed #000; padding-bottom: 2px; }
  .muted { color: #555; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  td { padding: 2px 0; vertical-align: top; }
  .total { font-size: 14px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>${escapeHtml(lojaNome ?? "Pedido")}</h1>
  <div class="muted" style="text-align:center">Pedido #${escapeHtml(p.numero)} — ${escapeHtml(new Date(p.created_at).toLocaleString("pt-BR"))}</div>

  <h2>Cliente</h2>
  <div>${escapeHtml(p.cliente_nome ?? "")}</div>
  <div>Tel: ${escapeHtml(p.cliente_telefone ?? "")}</div>

  <h2>Endereço de entrega</h2>
  <div>${escapeHtml(p.endereco_entrega ?? "")}${p.complemento ? ", " + escapeHtml(p.complemento) : ""}</div>

  ${p.observacoes ? `<h2>Observações</h2><div>${escapeHtml(p.observacoes)}</div>` : ""}

  <h2>Itens</h2>
  <table>${linhasItens || `<tr><td colspan="4" class="muted">Sem itens</td></tr>`}</table>

  <hr/>
  <div class="row"><span>Produtos</span><span>R$ ${valorProdutos.toFixed(2)}</span></div>
  <div class="row"><span>Taxa de entrega</span><span>R$ ${taxa.toFixed(2)}</span></div>
  ${bonus > 0 ? `<div class="row"><span>Bônus entregador</span><span>+ R$ ${bonus.toFixed(2)}</span></div>` : ""}
  <hr/>
  <div class="row total"><span>TOTAL</span><span>R$ ${total.toFixed(2)}</span></div>
  ${p.forma_pagamento ? `<div class="muted" style="margin-top:6px">Pagamento: ${escapeHtml(p.forma_pagamento)}</div>` : ""}

  ${qrImg}

  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
</body></html>`;

  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) {
    alert("Permita popups para imprimir o pedido.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function PedidosPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const [confirmar, setConfirmar] = useState<{ id: string; numero: number; tipo: "coleta" | "entrega" } | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const pedidosRef = useRef<any[]>([]);
  const detalheIdRef = useRef<string | null>(null);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("loja_id", loja!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    pedidosRef.current = (pedidos as any[] | undefined) ?? [];
  }, [pedidos]);

  useEffect(() => {
    detalheIdRef.current = detalhe?.id ?? null;
  }, [detalhe?.id]);

  useEffect(() => {
    if (!loja?.id) return;
    const channelKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`pedidos-${loja.id}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `loja_id=eq.${loja.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["pedidos", loja.id] });
          if (payload.eventType === "INSERT") {
            toast.success("🚨 Novo pedido recebido!");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loja?.id, qc]);

  // Notificação discreta de novas mensagens do entregador no chat do pedido
  useEffect(() => {
    if (!loja?.id || !pedidos || pedidos.length === 0) return;
    const channelKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`chat-msgs-loja-${loja.id}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedido_mensagens" },
        (payload) => {
          const msg: any = payload.new;
          if (!msg || msg.sender_role !== "entregador") return;
          const pedidosAtuais = pedidosRef.current;
          const pedido: any = pedidosAtuais.find((p) => p.id === msg.pedido_id);
          if (!pedido) return;
          // Evita toast quando a loja já está com o chat desse pedido aberto
          if (detalheIdRef.current === msg.pedido_id) return;
          const preview = String(msg.mensagem ?? "").slice(0, 80);
          toast.message(`💬 Nova mensagem · Pedido #${pedido.numero}`, {
            description: preview,
            duration: 10000,
            action: {
              label: "Abrir",
              onClick: () => {
                const atual = pedidosRef.current.find((p) => p.id === msg.pedido_id) ?? pedido;
                setDetalhe(atual);
              },
            },
          });

          qc.invalidateQueries({ queryKey: ["chat-nao-lidas", msg.pedido_id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loja?.id, !!pedidos?.length, qc]);

  // Auto-arquivar pedidos entregues após 5 minutos da confirmação de entrega
  useEffect(() => {
    if (!loja?.id || !pedidos || pedidos.length === 0) return;
    const CINCO_MIN = 5 * 60 * 1000;

    const tick = async () => {
      const agora = Date.now();
      const paraArquivar = (pedidosRef.current ?? []).filter((p: any) => {
        if (p.arquivado) return false;
        if (p.status !== "entregue") return false;
        const ref = p.entrega_confirmada_em ?? p.updated_at;
        if (!ref) return false;
        return agora - new Date(ref).getTime() >= CINCO_MIN;
      });
      if (paraArquivar.length === 0) return;
      const ids = paraArquivar.map((p: any) => p.id);
      const { error } = await supabase.from("pedidos").update({ arquivado: true }).in("id", ids);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["pedidos", loja.id] });
      }
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [loja?.id, pedidos, qc]);




  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("pedidos").update({ status: newStatus as any }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["pedidos", loja?.id] });
    if (newStatus === "pronto") {
      toast.success("Pedido pronto! Os entregadores vinculados já podem aceitar.");
    }
  };

  const marcarLoteComoPronto = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "pronto" as any })
      .in("id", ids)
      .eq("status", "em_preparo");
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["pedidos", loja?.id] });
    toast.success(`${ids.length} pedidos marcados como prontos!`);
  };

  const toggleArquivado = async (id: string, arquivado: boolean) => {
    const { error } = await supabase.from("pedidos").update({ arquivado: !arquivado }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["pedidos", loja?.id] });
      toast.success(arquivado ? "Pedido desarquivado." : "Pedido arquivado.");
    }
  };

  const cancelarPedido = async (id: string) => {
    const { error } = await supabase.from("pedidos").update({ status: "cancelado" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["pedidos", loja?.id] });
    toast.success("Pedido cancelado.");
  };

  const abrirWhatsAppRastreio = (pedido: any) => {
    const baseUrl = window.location.origin;
    const linkRastreio = `${baseUrl}/rastreio/${pedido.id}`;
    const mensagem = `Olá ${pedido.cliente_nome}! 👋\n\nSeu pedido #${pedido.numero} está a caminho! 🚀\n\n🔗 Acompanhe em tempo real:\n${linkRastreio}\n\n🔐 Código de confirmação de entrega:\n${pedido.codigo_entrega}\n\nObrigado pela preferência! 😊`;
    const telefone = String(pedido.cliente_telefone ?? "").replace(/\D/g, "");
    if (!telefone) {
      toast.error("Cliente não possui telefone cadastrado.");
      return;
    }
    const numeroWa = telefone.startsWith("55") ? telefone : `55${telefone}`;
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    (pedidos ?? []).forEach((p) => {
      if (p.arquivado && !mostrarArquivados) return;
      const col = COLUMNS.find((c) => c.statuses.includes(p.status));
      if (col) map[col.key].push(p);
    });
    return map;
  }, [pedidos, mostrarArquivados]);

  // Raio (km) para considerar duas entregas "próximas" e agrupar no mesmo lote.
  // Configurável pelo super admin em /admin/roteirizacao.
  const { data: configRoteirizacao } = useQuery({
    queryKey: ["config-roteirizacao-raio"],
    queryFn: async () => {
      const { data } = await supabase
        .from("config_roteirizacao")
        .select("raio_agrupamento_preparo_meters")
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
  const RAIO_AGRUPAMENTO_KM =
    (configRoteirizacao?.raio_agrupamento_preparo_meters ?? 1500) / 1000;

  const chaveColetaLoja = (p: any) => {
    if (p.endereco_coleta_lat != null && p.endereco_coleta_lng != null) {
      return `${Number(p.endereco_coleta_lat).toFixed(5)},${Number(p.endereco_coleta_lng).toFixed(5)}`;
    }
    return normalizarEndereco(p.endereco_coleta).toLowerCase();
  };

  const lotesEmPreparo = useMemo(() => {
    // Agrupa por mesma coleta + entregas próximas entre si.
    // Cluster greedy: cada pedido entra no primeiro cluster cujo centroide
    // está dentro do raio; senão abre um novo cluster.
    const porColeta = new Map<string, any[]>();
    for (const p of grouped.preparacao ?? []) {
      if (p.status !== "em_preparo") continue;
      const k = chaveColetaLoja(p);
      const arr = porColeta.get(k) ?? [];
      arr.push(p);
      porColeta.set(k, arr);
    }

    type Cluster = { items: any[]; sumLat: number; sumLng: number; count: number };
    const lotes: { key: string; items: any[]; ids: string[]; raioKm: number }[] = [];

    for (const [coletaKey, pedidosColeta] of porColeta) {
      const clusters: Cluster[] = [];
      const semCoord: any[] = [];

      for (const p of pedidosColeta) {
        const lat = p.endereco_entrega_lat != null ? Number(p.endereco_entrega_lat) : null;
        const lng = p.endereco_entrega_lng != null ? Number(p.endereco_entrega_lng) : null;
        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
          semCoord.push(p);
          continue;
        }
        let alvo: Cluster | null = null;
        for (const c of clusters) {
          const cLat = c.sumLat / c.count;
          const cLng = c.sumLng / c.count;
          if (haversineKm({ lat: cLat, lng: cLng }, { lat, lng }) <= RAIO_AGRUPAMENTO_KM) {
            alvo = c;
            break;
          }
        }
        if (alvo) {
          alvo.items.push(p);
          alvo.sumLat += lat;
          alvo.sumLng += lng;
          alvo.count += 1;
        } else {
          clusters.push({ items: [p], sumLat: lat, sumLng: lng, count: 1 });
        }
      }

      clusters.forEach((c, idx) => {
        if (c.items.length < 2) return;
        const cLat = c.sumLat / c.count;
        const cLng = c.sumLng / c.count;
        let maxKm = 0;
        for (const p of c.items) {
          const d = haversineKm(
            { lat: cLat, lng: cLng },
            { lat: Number(p.endereco_entrega_lat), lng: Number(p.endereco_entrega_lng) },
          );
          if (d > maxKm) maxKm = d;
        }
        lotes.push({
          key: `${coletaKey}|${idx}`,
          items: c.items,
          ids: c.items.map((p) => p.id),
          raioKm: maxKm,
        });
      });

      // Pedidos sem coordenadas: agrupa todos juntos se houver 2+
      if (semCoord.length >= 2) {
        lotes.push({
          key: `${coletaKey}|sem-coord`,
          items: semCoord,
          ids: semCoord.map((p) => p.id),
          raioKm: 0,
        });
      }
    }
    return lotes;
  }, [grouped, RAIO_AGRUPAMENTO_KM]);

  const handleDrop = (colKey: string) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const pedido = (pedidos ?? []).find((p) => p.id === id);
    if (!pedido) return;
    const lojaControla = pedido.status === "novo" || pedido.status === "aceito" || pedido.status === "em_preparo";
    if (!lojaControla) {
      toast.error("Esse pedido é atualizado pelo app do entregador.");
      return;
    }
    const targetCol = COLUMNS.find((c) => c.key === colKey);
    if (!targetCol) return;
    const currentCol = COLUMNS.find((c) => c.statuses.includes(pedido.status));
    if (!currentCol) return;
    if (currentCol.key === targetCol.key) return;

    // Avança sequencialmente pelo NEXT até chegar na coluna de destino
    let nextStatus: string | null = NEXT[pedido.status];
    let finalStatus: string | null = null;
    const visited = new Set<string>();
    while (nextStatus && !visited.has(nextStatus)) {
      visited.add(nextStatus);
      if (targetCol.statuses.includes(nextStatus)) {
        finalStatus = nextStatus;
        break;
      }
      nextStatus = NEXT[nextStatus];
    }
    if (!finalStatus) {
      toast.error("Mova para a próxima coluna do fluxo.");
      return;
    }
    updateStatus(id, finalStatus);
  };

  if (!loja) {
    return (
      <LojaShell title="Pedidos">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Pedidos">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/loja/novo-pedido"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" /> Novo Pedido
        </Link>
        {loja.slug && (
          <a
            href={`/loja/${loja.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline truncate"
          >
            Link público: /loja/{loja.slug}
          </a>
        )}
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.55_0.26_25)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(0.55_0.26_25)]" />
          </span>
          Tempo real
        </span>
        <button
          onClick={() => setMostrarArquivados((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
        >
          {mostrarArquivados ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {mostrarArquivados ? "Ocultar arquivados" : "Mostrar arquivados"}
        </button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {pedidos && pedidos.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-2xl tracking-wide mb-2">Nenhum pedido ainda</p>
          <p className="text-muted-foreground text-sm">
            Os pedidos do seu cardápio aparecerão aqui em tempo real.
          </p>
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = grouped[col.key] ?? [];
            const isOver = dragOver === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver((v) => (v === col.key ? null : v))}
                onDrop={() => handleDrop(col.key)}
                className={`bg-muted/30 border rounded-lg border-t-4 ${col.accent} flex flex-col min-h-[200px] transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="px-3 py-2 flex items-center justify-between border-b border-border">
                  <h3 className="font-display text-base tracking-wide">{col.title}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-background border border-border rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {col.key === "preparacao" && lotesEmPreparo.map((lote) => (
                    <div
                      key={`lote-${lote.key}`}
                      className="border border-[oklch(0.55_0.16_75_/_0.40)] bg-[oklch(0.55_0.16_75_/_0.10)] rounded-md p-2 space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.75_0.12_75)]">
                        <Layers className="h-3 w-3" />
                        Lote · {lote.items.length} entregas próximas
                        {lote.raioKm > 0 && (
                          <span className="font-normal normal-case text-muted-foreground">
                            (~{lote.raioKm.toFixed(1)} km entre si)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {lote.items.map((p) => `#${p.numero}`).join(" · ")}
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Marcar ${lote.ids.length} pedidos como prontos?`)) {
                            marcarLoteComoPronto(lote.ids);
                          }
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[oklch(0.55_0.26_25)] hover:bg-[oklch(0.48_0.24_25)] text-white font-bold uppercase text-[10px] tracking-wider rounded"
                      >
                        <CheckCheck className="h-3 w-3" /> Marcar todos como pronto
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4">Vazio</p>
                  )}
                  {items.map((p) => {
                    const lojaControla = p.status === "novo" || p.status === "aceito" || p.status === "em_preparo";
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        draggable={lojaControla}
                        onDragStart={(e) => {
                          if (!lojaControla) { e.preventDefault(); return; }
                          setDragId(p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => { setDragId(null); setDragOver(null); }}
                        onClick={() => setDetalhe(p)}
                        onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetalhe(p); } }}
                        className={`w-full text-left bg-card border border-[oklch(0.78_0.16_75_/_0.40)] rounded-md p-2 shadow-card hover:border-[oklch(0.78_0.16_75_/_0.65)] transition-all ${lojaControla ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dragId === p.id ? "opacity-50" : ""}`}
                      >

                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display text-base tracking-wide leading-none">#{p.numero}</div>
                          <div className="flex items-center gap-1.5">
                            <PedidoChatBadge pedidoId={p.id} senderRole="loja" />
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${STATUS_COLOR[p.status]}`}
                            >
                              {STATUS_LABEL[p.status]}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs font-medium truncate">{p.cliente_nome}</div>
                        {p.rota_id && (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[oklch(0.40_0.06_265_/_0.15)] text-[oklch(0.75_0.08_265)] text-[9px] font-bold uppercase tracking-wider rounded">
                            <Bike className="h-2.5 w-2.5" />
                            Rota {p.rota_ordem ? `· parada ${p.rota_ordem}` : "agrupada"}
                            {p.atribuido_automaticamente && " · auto"}
                            {p.duracao_estimada_seg != null &&
                              ` · ${Math.max(1, Math.round(p.duracao_estimada_seg / 60))} min`}
                          </div>
                        )}
                        {p.entregador_id && <EntregadorNomeBadge pedidoId={p.id} />}
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-base text-primary leading-none">
                              R$ {Number(p.valor_total).toFixed(2)}
                            </span>
                            <span onClick={(e) => e.stopPropagation()}>
                              <ChatPedidoButton
                                pedidoId={p.id}
                                pedidoNumero={p.numero}
                                senderRole="loja"
                                variant="ghost"
                              />
                            </span>
                          </div>
                          {(p.status === "entregue" || p.status === "em_rota" || p.codigo_entrega) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                          {p.status === "entregue" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleArquivado(p.id, p.arquivado); }}
                                  className={`inline-flex items-center gap-1 px-2 py-1 font-bold uppercase text-[9px] tracking-wider rounded ${p.arquivado ? "bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.65_0.14_75)] text-[#0e0f12]" : "bg-zinc-600 hover:bg-zinc-700 text-white"}`}
                                  title={p.arquivado ? "Desarquivar" : "Arquivar"}
                                >
                                  {p.arquivado ? <ArchiveRestore className="h-2.5 w-2.5" /> : <Archive className="h-2.5 w-2.5" />}
                                  {p.arquivado ? "Desarquivar" : "Arquivar"}
                                </button>
                              )}
                              {p.status === "em_rota" && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); setConfirmar({ id: p.id, numero: p.numero, tipo: "coleta" }); }}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[oklch(0.40_0.06_265)] hover:bg-[oklch(0.45_0.06_265)] text-white font-bold uppercase text-[9px] tracking-wider rounded"
                                >
                                  <KeyRound className="h-2.5 w-2.5" /> Coleta
                                </span>
                              )}
                              {p.codigo_entrega && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); abrirWhatsAppRastreio(p); }}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.60_0.14_75)] text-[#0e0f12] font-bold uppercase text-[9px] tracking-wider rounded"
                                >
                                  <MessageCircle className="h-2.5 w-2.5" /> Rastreio
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!detalhe} onOpenChange={(o: boolean) => { if (!o) setDetalhe(null); }}>
        <SheetContent side="right" className="panel-premium w-full sm:max-w-none sm:w-1/2 overflow-y-auto bg-[oklch(0.12_0.015_260)] border-l border-[oklch(0.78_0.16_75_/_0.35)] text-[var(--panel-text)]">
          {detalhe && (
            <>
              <SheetHeader className="pb-4 border-b border-[oklch(0.78_0.16_75_/_0.25)]">
                <SheetTitle className="pp-title-page text-3xl text-white flex items-center justify-between gap-3">
                  <span>Pedido <span className="text-[var(--rota-gold)]">#{detalhe.numero}</span></span>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full ${STATUS_COLOR[detalhe.status]}`}>
                    {STATUS_LABEL[detalhe.status]}
                  </span>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 text-xs pp-eyebrow !tracking-[0.2em]">
                  <Calendar className="h-3 w-3" />
                  {new Date(detalhe.created_at).toLocaleString("pt-BR")}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 text-sm pp-reveal pt-5">
                <div className="pp-card p-4 space-y-2">
                  <div className="pp-eyebrow">Cliente</div>
                  <div className="flex items-center gap-2 text-[var(--panel-text)]"><User className="h-4 w-4 text-[var(--rota-gold)]" /> {detalhe.cliente_nome}</div>
                  <div className="flex items-center gap-2 text-[var(--panel-text)]"><Phone className="h-4 w-4 text-[var(--rota-gold)]" /> {detalhe.cliente_telefone}</div>
                </div>

                <div className="pp-card p-4 space-y-2">
                  <div className="pp-eyebrow">Endereço</div>
                  <div className="flex items-start gap-2 text-[var(--panel-text)]">
                    <MapPin className="h-4 w-4 mt-0.5 text-[var(--rota-gold)] shrink-0" />
                    <span>
                      {detalhe.endereco_entrega}
                      {detalhe.complemento ? `, ${detalhe.complemento}` : ""}
                    </span>
                  </div>
                </div>

                {detalhe.observacoes && (
                  <div className="pp-card p-4 space-y-2">
                    <div className="pp-eyebrow">Observações</div>
                    <div className="flex items-start gap-2 text-[var(--panel-text)]">
                      <FileText className="h-4 w-4 mt-0.5 text-[var(--rota-gold)] shrink-0" />
                      <span className="whitespace-pre-wrap">{detalhe.observacoes}</span>
                    </div>
                  </div>
                )}

                {Array.isArray(detalhe.itens) && detalhe.itens.length > 0 && (
                  <div className="pp-card p-4 space-y-2">
                    <div className="pp-eyebrow">Itens</div>
                    <div className="rounded-lg divide-y divide-[oklch(0.78_0.16_75_/_0.15)] border border-[oklch(0.78_0.16_75_/_0.20)] overflow-hidden">
                      {detalhe.itens.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs bg-[oklch(0.16_0.015_260_/_0.5)]">
                          <span className="truncate text-[var(--panel-text)]">
                            {it.quantidade ? `${it.quantidade}× ` : ""}{it.nome ?? it.descricao ?? "Item"}
                          </span>
                          {it.preco != null && (
                            <span className="pp-num text-sm text-[var(--rota-gold)]">R$ {Number(it.preco).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pp-card p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--panel-text-muted)]">Itens</span>
                    <span className="pp-num text-[var(--panel-text)]">R$ {Number(detalhe.valor_produtos ?? (Number(detalhe.valor_total) - Number(detalhe.taxa_entrega ?? 0))).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--panel-text-muted)]">Taxa de entrega</span>
                    <span className="pp-num text-[var(--panel-text)]">R$ {(Number(detalhe.taxa_entrega ?? 0) - Number((detalhe as any).bonus_entregador ?? 0)).toFixed(2)}</span>
                  </div>
                  {Number((detalhe as any).bonus_entregador ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--panel-text-muted)]">Bônus ao entregador</span>
                      <span className="pp-num text-[var(--rota-gold)]">+ R$ {Number((detalhe as any).bonus_entregador).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-[oklch(0.78_0.16_75_/_0.25)]">
                    <span className="pp-eyebrow">Total</span>
                    <span className="pp-num text-3xl" style={{ background: "var(--gradient-gold)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>R$ {Number(detalhe.valor_total).toFixed(2)}</span>
                  </div>
                </div>

                {detalhe.entregador_id && (
                  <>
                    <EntregadorPixCard
                      pedidoId={detalhe.id}
                      valor={Number(detalhe.taxa_entrega ?? 0)}
                      entregaPaga={!!detalhe.entrega_paga}
                      entregaPagaEm={detalhe.entrega_paga_em}
                      onPagoChange={(pago) => setDetalhe({ ...detalhe, entrega_paga: pago, entrega_paga_em: new Date().toISOString() })}
                    />
                    <div className="flex justify-end">
                      <ChatPedidoButton pedidoId={detalhe.id} pedidoNumero={detalhe.numero} senderRole="loja" contraparteNome="Entregador" />
                    </div>
                  </>
                )}

                {detalhe.codigo_entrega && (
                  <div className="pp-card p-4 space-y-3">
                    <div className="pp-eyebrow">Rastreio do cliente</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="pp-num font-mono bg-[oklch(0.16_0.015_260_/_0.6)] rounded px-2.5 py-1 border border-[oklch(0.78_0.16_75_/_0.35)] text-[var(--rota-gold)] tracking-widest">{detalhe.codigo_entrega}</span>
                      <span className="text-[var(--panel-text-muted)]">código de confirmação</span>
                    </div>
                    <a
                      href={`${window.location.origin}/rastreio/${detalhe.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--rota-gold)] hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> Abrir link de rastreio
                    </a>
                    <button
                      onClick={() => abrirWhatsAppRastreio(detalhe)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[oklch(0.55_0.26_25)] hover:bg-[oklch(0.48_0.24_25)] text-white font-semibold uppercase text-xs tracking-[0.15em] rounded-lg"
                    >
                      <MessageCircle className="h-4 w-4" /> Rastreio pelo WhatsApp
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => imprimirPedido(detalhe, loja?.nome)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.20_0.02_260)] hover:bg-[oklch(0.24_0.02_260)] text-[var(--panel-text)] border border-[oklch(0.78_0.16_75_/_0.25)] font-semibold uppercase text-xs tracking-[0.15em] rounded-lg"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>


                  {(detalhe.status === "novo" || detalhe.status === "aceito" || detalhe.status === "em_preparo") && NEXT[detalhe.status] && (
                    <button
                      onClick={() => {
                        const next = NEXT[detalhe.status]!;
                        updateStatus(detalhe.id, next);
                        setDetalhe({ ...detalhe, status: next });
                      }}
                      className="pp-cta uppercase tracking-[0.15em]"
                    >
                      Avançar para {STATUS_LABEL[NEXT[detalhe.status]!]}
                    </button>
                  )}
                  {detalhe.status !== "entregue" && detalhe.status !== "cancelado" && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Cancelar pedido #${detalhe.numero}?`)) {
                          cancelarPedido(detalhe.id);
                          setDetalhe({ ...detalhe, status: "cancelado" });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold uppercase text-xs tracking-wider rounded-md"
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar pedido
                    </button>
                  )}
                  {detalhe.status === "entregue" && (
                    <button
                      onClick={() => { toggleArquivado(detalhe.id, detalhe.arquivado); setDetalhe({ ...detalhe, arquivado: !detalhe.arquivado }); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold uppercase text-xs tracking-wider rounded-md ${detalhe.arquivado ? "bg-[oklch(0.55_0.16_75)] hover:bg-[oklch(0.65_0.14_75)] text-[#0e0f12]" : "bg-zinc-600 hover:bg-zinc-700 text-white"}`}
                    >
                      {detalhe.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {detalhe.arquivado ? "Desarquivar" : "Arquivar"}
                    </button>
                  )}
                  {detalhe.status === "em_rota" && (
                    <button
                      onClick={() => { setConfirmar({ id: detalhe.id, numero: detalhe.numero, tipo: "coleta" }); setDetalhe(null); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[oklch(0.40_0.06_265)] hover:bg-[oklch(0.45_0.06_265)] text-white font-bold uppercase text-xs tracking-wider rounded-md"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Confirmar coleta
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {confirmar && (
        <ConfirmarCodigoDialog
          open={!!confirmar}
          onOpenChange={(o) => { if (!o) setConfirmar(null); }}
          pedidoId={confirmar.id}
          pedidoNumero={confirmar.numero}
          tipo={confirmar.tipo}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["pedidos", loja?.id] })}
        />
      )}
    </LojaShell>
  );
}
