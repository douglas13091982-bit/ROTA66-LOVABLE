import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


/**
 * Envia uma notificação push de teste para o próprio usuário autenticado,
 * reutilizando o endpoint /api/public/send-push (que já contém toda a
 * lógica de VAPID + criptografia RFC 8291).
 */
export const enviarPushTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Recupera o segredo compartilhado usado pelo endpoint público.
    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) {
      throw new Error("push_trigger_secret não configurado");
    }

    // Verifica se o usuário tem alguma inscrição push ativa.
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", context.userId);
    if (!subs || subs.length === 0) {
      return { sent: 0, subscriptions: 0 };
    }

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-push-secret": secret,
      },
      body: JSON.stringify({
        user_id: context.userId,
        title: "Rota 66 — Teste de notificação",
        body: "Se você recebeu esta mensagem, as notificações estão funcionando!",
        url: "/entregador/disponiveis",
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao enviar push (${res.status})`);
    }
    const json = (await res.json()) as { sent: number };
    return { sent: json.sent ?? 0, subscriptions: subs.length };
  });

/**
 * Notifica todos os entregadores externos aprovados sobre um novo turno
 * publicado por uma loja. Deve ser chamado logo após `publicar_turno` ter
 * sucesso e usa os mesmos destinatários gravados em `agendamento_ofertas`.
 */
export const notificarTurnoPublicado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ agendamento_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Carrega o turno e a loja
    const { data: turno, error: errTurno } = await supabaseAdmin
      .from("agendamentos" as any)
      .select("id, loja_id, data_turno, hora_inicio, valor_por_hora, taxa_por_entrega, duracao_horas")
      .eq("id", data.agendamento_id)
      .maybeSingle();
    if (errTurno || !turno) throw new Error("Turno não encontrado");

    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("id, nome, city_id, owner_id")
      .eq("id", (turno as any).loja_id)
      .maybeSingle();
    if (!loja) throw new Error("Loja não encontrada");

    // Segurança: apenas dono da loja, super admin ou funcionário ativo da loja.
    if ((loja as any).owner_id !== userId) {
      const { data: isSuper } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "super_admin",
      });
      if (!isSuper) {
        const { data: funcionario } = await supabaseAdmin
          .from("loja_funcionarios" as any)
          .select("id")
          .eq("loja_id", (turno as any).loja_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!funcionario) throw new Error("Sem permissão");
      }
    }

    // Pool alvo: exatamente os entregadores que receberam oferta do turno
    // na RPC publicar_turno. Assim o push acompanha a mesma regra do pool.
    const { data: ofertas } = await supabaseAdmin
      .from("agendamento_ofertas" as any)
      .select("entregador_id")
      .eq("agendamento_id", data.agendamento_id);
    const alvos = Array.from(new Set((ofertas ?? []).map((o: any) => o.entregador_id).filter(Boolean)));
    if (alvos.length === 0) return { sent: 0, destinatarios: 0 };

    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) throw new Error("push_trigger_secret não configurado");

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;

    const dataFmt = (() => {
      try {
        const [y, m, d] = String((turno as any).data_turno).split("-");
        return `${d}/${m}`;
      } catch {
        return String((turno as any).data_turno);
      }
    })();
    const horaFmt = String((turno as any).hora_inicio).slice(0, 5);
    const valorHora = Number((turno as any).valor_por_hora ?? 0);
    const nomeLoja = (loja as any).nome || "Loja";

    const title = "Nova Oportunidade Garantida";
    const body = `${nomeLoja} publicou um turno em ${dataFmt} às ${horaFmt} — R$ ${valorHora.toFixed(2)}/h. Corra e garanta o seu!`;
    const linkFinal = "/entregador/turnos";
    const tag = `turno-${(turno as any).id}`;

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", alvos);
    const nomes = new Map<string, string>((profs ?? []).map((p: any) => [p.id, p.full_name || ""]));

    const logRows = alvos.map((uid) => ({
      sender_user_id: userId,
      user_id: uid,
      entregador_nome: nomes.get(uid) || null,
      title,
      body,
      url: linkFinal,
      tag,
      status: "pending",
    }));
    if (logRows.length) {
      const { error: logErr } = await supabaseAdmin.from("push_admin_logs" as any).insert(logRows);
      if (logErr) console.error("[turno-push] insert log falhou", logErr);
    }

    console.log(
      "[turno-push] disparo",
      JSON.stringify({ turno_id: (turno as any).id, tag, destinatarios: alvos.length }),
    );

    let sent = 0;
    const CONC = 10;
    for (let i = 0; i < alvos.length; i += CONC) {
      const batch = alvos.slice(i, i + CONC);
      const results = await Promise.all(
        batch.map(async (uid) => {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "content-type": "application/json", "x-push-secret": secret },
              body: JSON.stringify({ user_id: uid, title, body, url: linkFinal, tag }),
            });
            if (!res.ok) return 0;
            const j = (await res.json()) as { sent?: number };
            return j.sent ?? 0;
          } catch {
            return 0;
          }
        }),
      );
      sent += results.reduce((a, b) => a + b, 0);
    }

    return { sent, destinatarios: alvos.length };
  });

/**
 * Envia push para um entregador informando que sua conta foi aprovada
 * e ele já pode receber pedidos.
 */
export const notificarEntregadorAprovado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ entregador_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Autoriza: super_admin, franqueado (config) ou colaborador ativo.
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isSuper) {
      const { data: cfgSelf } = await supabaseAdmin
        .from("franqueados_config" as any)
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      let autorizado = !!(cfgSelf as any)?.user_id;
      if (!autorizado) {
        const { data: colab } = await supabaseAdmin
          .from("franqueado_colaboradores" as any)
          .select("id")
          .eq("colaborador_user_id", userId)
          .eq("ativo", true)
          .maybeSingle();
        autorizado = !!colab;
      }
      if (!autorizado) throw new Error("Sem permissão");
    }


    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", data.entregador_id);
    if (!subs || subs.length === 0) return { sent: 0, destinatarios: 0 };

    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) throw new Error("push_trigger_secret não configurado");

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.entregador_id)
      .maybeSingle();

    const title = "🎉 Conta aprovada!";
    const body = "Sua conta foi liberada. Você já pode receber pedidos agora mesmo.";
    const linkFinal = "/entregador/disponiveis";
    const tag = `aprovado-${data.entregador_id}`;

    await supabaseAdmin.from("push_admin_logs" as any).insert({
      sender_user_id: userId,
      user_id: data.entregador_id,
      entregador_nome: (prof as any)?.full_name || null,
      title,
      body,
      url: linkFinal,
      tag,
      status: "pending",
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-push-secret": secret },
        body: JSON.stringify({ user_id: data.entregador_id, title, body, url: linkFinal, tag }),
      });
      if (!res.ok) return { sent: 0, destinatarios: 1 };
      const j = (await res.json()) as { sent?: number };
      return { sent: j.sent ?? 0, destinatarios: 1 };
    } catch {
      return { sent: 0, destinatarios: 1 };
    }
  });


