// Server-only: calcula a taxa cobrada pelo Mercado Pago em um pagamento
// e reflete no saldo da loja (debitar_taxa_mp_pedido).
//
// Regras de tarifa (recebimento na hora):
//   pix          → 0,99%
//   debit_card   → 1,99%
//   credit_card  → 4,99%
//
// Sempre que o MP retornar `fee_details` (taxa real cobrada), usamos ele.
// Caso contrário caímos nas taxas padrão acima.

interface MpPaymentLike {
  id?: number | string;
  payment_type_id?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  fee_details?: Array<{ type?: string; amount?: number; fee_payer?: string }>;
}

function metodoLegivel(p: MpPaymentLike): string {
  const t = p.payment_type_id ?? "";
  if (t === "credit_card") return "cartão de crédito";
  if (t === "debit_card") return "cartão de débito";
  if (t === "bank_transfer" || p.payment_method_id === "pix") return "pix";
  return t || p.payment_method_id || "mp";
}

function tipoKey(p: MpPaymentLike): "pix" | "debit_card" | "credit_card" | null {
  const t = p.payment_type_id ?? "";
  if (t === "credit_card") return "credit_card";
  if (t === "debit_card") return "debit_card";
  if (t === "bank_transfer" || p.payment_method_id === "pix") return "pix";
  return null;
}

export async function calcularTaxaMp(payment: MpPaymentLike): Promise<{ taxa: number; metodo: string }> {
  const metodo = metodoLegivel(payment);

  // 1) Preferir taxa real (fee_details) — soma taxas cujo fee_payer é o
  //    vendedor (collector) ou não informado.
  const soma = (payment.fee_details ?? []).reduce((acc, f) => {
    const payer = (f.fee_payer ?? "collector").toLowerCase();
    if (payer === "payer") return acc; // taxa paga pelo cliente
    return acc + (Number(f.amount) || 0);
  }, 0);
  if (soma > 0) return { taxa: Math.round(soma * 100) / 100, metodo };

  // 2) Fallback: aplicar percentual configurado pelo super admin.
  const tipo = tipoKey(payment);
  if (!tipo) return { taxa: 0, metodo };
  const valor = Number(payment.transaction_amount ?? 0);
  if (valor <= 0) return { taxa: 0, metodo };
  const { getMpTaxas } = await import("@/lib/plataforma-mp.server");
  const cfg = await getMpTaxas();
  const pct = cfg[tipo] / 100;
  if (pct <= 0) return { taxa: 0, metodo };
  const taxa = Math.round(valor * pct * 100) / 100;
  return { taxa, metodo };
}


export async function aplicarTaxaMpAoPedido(
  pedidoId: string | null | undefined,
  payment: MpPaymentLike,
): Promise<void> {
  if (!pedidoId) return;
  const { taxa, metodo } = calcularTaxaMp(payment);
  if (taxa <= 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("debitar_taxa_mp_pedido" as any, {
      _pedido_id: pedidoId,
      _taxa: taxa,
      _metodo: metodo,
    } as any);
    if (error) console.error("[mp-taxa] debitar_taxa_mp_pedido", error.message);
  } catch (e: any) {
    console.error("[mp-taxa] erro inesperado", e?.message ?? e);
  }
}
