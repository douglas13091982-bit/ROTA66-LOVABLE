// Server-only: idempotência de webhooks do Mercado Pago.
// Registra cada (mp_payment_id, mp_status, origem) na tabela mp_webhook_eventos
// aproveitando a UNIQUE constraint para bloquear reprocessamento.

export async function claimWebhookEvent(
  mpPaymentId: string,
  mpStatus: string,
  origem: string,
  payload?: unknown,
): Promise<{ first: boolean }> {
  if (!mpPaymentId || !mpStatus || !origem) return { first: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("mp_webhook_eventos" as any).insert({
    mp_payment_id: String(mpPaymentId),
    mp_status: String(mpStatus),
    origem,
    payload: (payload ?? null) as any,
  } as any);
  if (error) {
    // 23505 = unique_violation → já processado
    if ((error as any).code === "23505") return { first: false };
    // Não bloqueia o processamento se a tabela falhar por outro motivo;
    // apenas loga para investigação.
    console.error("[mp-webhook-idempotencia]", error.message);
  }
  return { first: true };
}
