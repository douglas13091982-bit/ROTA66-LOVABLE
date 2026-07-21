import QRCode from "qrcode";
import { formatDateTime } from "@/lib/format";

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface PedidoItem {
  qtd?: number;
  quantidade?: number;
  nome?: string;
  preco?: number;
}

interface PedidoImprimivel {
  id: string;
  numero: number;
  created_at: string;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  endereco_entrega?: string | null;
  complemento?: string | null;
  observacoes?: string | null;
  itens?: PedidoItem[];
  valor_produtos?: number | null;
  valor_total: number;
  taxa_entrega?: number | null;
  bonus_entregador?: number | null;
  forma_pagamento?: string | null;
  codigo_coleta?: string | null;
  codigo_entrega?: string | null;
  origem?: string | null;
}

function buildItensTableRows(itens: PedidoItem[]): string {
  return itens
    .map((it) => {
      const qtd = Number(it.qtd ?? it.quantidade ?? 1);
      const preco = Number(it.preco ?? 0);
      return `
        <tr>
          <td>${escapeHtml(qtd)}x</td>
          <td>${escapeHtml(it.nome ?? "")}</td>
          <td style="text-align:right">R$ ${preco.toFixed(2)}</td>
          <td style="text-align:right">R$ ${(qtd * preco).toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

async function buildQrImg(pedidoId: string): Promise<string> {
  const pedidoUrl = `${window.location.origin}/rastreio/${pedidoId}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(pedidoUrl, { width: 200, margin: 2 });
    return `<div style="text-align:center;margin-top:12px;">
      <img src="${qrDataUrl}" style="width:140px;height:140px;display:block;margin:0 auto;" alt="QR Code" />
      <div class="muted" style="margin-top:4px;font-size:10px;">Escaneie para rastreio/conferência</div>
    </div>`;
  } catch {
    return `<div class="muted" style="text-align:center;margin-top:12px;">[QR Code indisponível]</div>`;
  }
}

const PRINT_STYLES = `
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
  .codigo-box { border: 2px dashed #000; padding: 10px 8px; text-align: center; margin: 10px 0; }
  .codigo-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
  .codigo-num { font-size: 40px; font-weight: 900; letter-spacing: 12px; font-family: 'Courier New', monospace; line-height: 1; }
  @media print { body { padding: 0; } }
`;

/** Abre uma nova janela com o cupom do pedido e dispara impressão. */
export async function imprimirPedido(
  p: PedidoImprimivel | null | undefined,
  lojaNome?: string,
): Promise<void> {
  if (!p) return;

  const itens = Array.isArray(p.itens) ? p.itens : [];
  const valorProdutos = Number(
    p.valor_produtos ?? Number(p.valor_total) - Number(p.taxa_entrega ?? 0),
  );
  const taxa = Number(p.taxa_entrega ?? 0);
  const bonus = Number(p.bonus_entregador ?? 0);
  const total = Number(p.valor_total ?? 0);

  const linhasItens = buildItensTableRows(itens);
  const qrImg = await buildQrImg(p.id);

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido #${escapeHtml(p.numero)}</title>
<style>${PRINT_STYLES}</style></head>
<body>
  <h1>${escapeHtml(lojaNome ?? "Pedido")}</h1>
  <div class="muted" style="text-align:center">Pedido #${escapeHtml(p.numero)} — ${escapeHtml(formatDateTime(p.created_at))}</div>

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
