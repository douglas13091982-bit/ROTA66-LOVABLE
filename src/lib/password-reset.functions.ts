import { createServerFn } from "@tanstack/react-start";

/**
 * Redefine a senha do usuário usando um token aprovado pelo admin.
 * Não exige sessão — o próprio token é a autorização.
 */
export const redefinirSenhaComToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; password: string }) => {
    if (!data?.token || typeof data.token !== "string") {
      throw new Error("Token inválido.");
    }
    if (!data?.password || data.password.length < 6) {
      throw new Error("A senha precisa ter ao menos 6 caracteres.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // valida token
    const { data: row, error: selErr } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, user_id, status, token_expires_at, email")
      .eq("token", data.token)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("Link inválido.");
    if (row.status !== "aprovado") throw new Error("Link já utilizado ou cancelado.");
    if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
      await supabaseAdmin
        .from("password_reset_requests")
        .update({ status: "expirado" })
        .eq("id", row.id);
      throw new Error("Link expirado.");
    }
    if (!row.user_id) throw new Error("Usuário não encontrado.");

    // atualiza a senha via Auth Admin API
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: data.password,
    });
    if (updErr) throw new Error(updErr.message);

    // marca como usado
    await supabaseAdmin
      .from("password_reset_requests")
      .update({ status: "usado", used_at: new Date().toISOString(), token: null })
      .eq("id", row.id);

    return { ok: true };
  });
