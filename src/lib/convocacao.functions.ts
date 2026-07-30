import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lojaAbertaAgora, type HorarioFuncionamento } from "@/lib/horario-funcionamento";

const Input = z.object({
  loja_id: z.string().uuid(),
  motivo: z.enum(["abertura", "primeiro_pedido"]),
});

/** Data "de hoje" no fuso de São Paulo, no formato YYYY-MM-DD. */
function hojeSP(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Instante atual convertido para o fuso de São Paulo (para checar horário). */
function agoraSP(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
}

/**
 * Dispara um push de convocação para os entregadores aprovados da cidade da
 * loja quando ela abre ou recebe o primeiro pedido do dia.
 *
 * Regras de segurança:
 *  - Só dono da loja, funcionário ativo, super admin ou franqueado da cidade
 *    podem acionar.
 *  - O público-alvo é sempre calculado no servidor a partir da cidade da loja.
 *  - Uma convocação por loja/motivo/dia (garantido por UNIQUE no banco).
 *  - O texto do push nunca contém dados de cliente.
 */
export const convocarEntregadoresCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("id, nome, city_id, owner_id, ativa, horario_funcionamento")
      .eq("id", data.loja_id)
      .maybeSingle();
    if (!loja) throw new Error("Loja não encontrada");
    const l = loja as any;
    if (!l.city_id) return { skipped: "sem_cidade" as const, sent: 0, destinatarios: 0 };
    if (l.ativa === false) return { skipped: "loja_inativa" as const, sent: 0, destinatarios: 0 };

    // ---- Autorização ------------------------------------------------------
    if (l.owner_id !== userId) {
      const { data: isSuper } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "super_admin",
      });
      let autorizado = !!isSuper;
      if (!autorizado) {
        const { data: func } = await supabaseAdmin
          .from("loja_funcionarios" as any)
          .select("id")
          .eq("loja_id", l.id)
          .eq("user_id", userId)
          .maybeSingle();
        autorizado = !!func;
      }
      if (!autorizado) {
        // Franqueado (ou colaborador) da mesma cidade da loja.
        const { data: cfgSelf } = await supabaseAdmin
          .from("franqueados_config" as any)
          .select("user_id, city_id")
          .eq("user_id", userId)
          .maybeSingle();
        let cityFranqueado = (cfgSelf as any)?.city_id as string | null | undefined;
        if (!cfgSelf) {
          const { data: colab } = await supabaseAdmin
            .from("franqueado_colaboradores" as any)
            .select("franqueado_user_id")
            .eq("colaborador_user_id", userId)
            .eq("ativo", true)
            .maybeSingle();
          if ((colab as any)?.franqueado_user_id) {
            const { data: cfg } = await supabaseAdmin
              .from("franqueados_config" as any)
              .select("city_id")
              .eq("user_id", (colab as any).franqueado_user_id)
              .maybeSingle();
            cityFranqueado = (cfg as any)?.city_id ?? null;
          }
        }
        autorizado = !!cityFranqueado && cityFranqueado === l.city_id;
      }
      if (!autorizado) throw new Error("Sem permissão");
    }

    // ---- Validação do gatilho (servidor decide, não o cliente) ------------
    if (data.motivo === "abertura") {
      const aberta = lojaAbertaAgora(
        (l.horario_funcionamento ?? null) as HorarioFuncionamento | null,
        agoraSP(),
      );
      if (!aberta) return { skipped: "loja_fechada" as const, sent: 0, destinatarios: 0 };
    } else {
      // Só vale se realmente for o primeiro pedido do dia da loja.
      const inicioDia = new Date(`${hojeSP()}T00:00:00-03:00`).toISOString();
      const { count } = await supabaseAdmin
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("loja_id", l.id)
        .gte("created_at", inicioDia);
      if ((count ?? 0) > 1) {
        return { skipped: "nao_e_primeiro" as const, sent: 0, destinatarios: 0 };
      }
    }

    // ---- Dedupe: uma convocação por loja/motivo/dia ------------------------
    const { data: reserva, error: reservaErr } = await supabaseAdmin
      .from("convocacoes_entregadores" as any)
      .insert({ loja_id: l.id, motivo: data.motivo, dia: hojeSP() })
      .select("id")
      .maybeSingle();
    if (reservaErr) {
      // Violação de UNIQUE => já convocamos hoje por esse motivo.
      return { skipped: "ja_convocado" as const, sent: 0, destinatarios: 0 };
    }

    // ---- Público-alvo: entregadores aprovados da cidade da loja -----------
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "entregador");
    const entregadorIds = (roles ?? []).map((r: any) => r.user_id);
    if (entregadorIds.length === 0) return { sent: 0, destinatarios: 0 };

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("id", entregadorIds)
      .eq("city_id", l.city_id);
    let alvos = (profs ?? []).map((p: any) => p.id as string);
    if (alvos.length === 0) return { sent: 0, destinatarios: 0 };

    const { data: contas } = await supabaseAdmin
      .from("entregador_status_conta" as any)
      .select("entregador_id, status")
      .in("entregador_id", alvos);
    const statusMap = new Map<string, string>(
      (contas ?? []).map((c: any) => [c.entregador_id, c.status]),
    );
    alvos = alvos.filter((id) => statusMap.get(id) === "aprovado");
    if (alvos.length === 0) return { sent: 0, destinatarios: 0 };

    const nomeLoja = String(l.nome || "Uma loja");
    const title =
      data.motivo === "abertura" ? "🟢 Loja aberta na sua cidade" : "📦 Pedidos começaram!";
    const body =
      data.motivo === "abertura"
        ? `${nomeLoja} acabou de abrir. Fique online para pegar as primeiras corridas.`
        : `${nomeLoja} liberou o primeiro pedido do dia. Entre no app e garanta a corrida.`;
    const url = "/entregador/disponiveis";
    const tag = `convocacao-${l.id}-${data.motivo}-${hojeSP()}`;

    const { enviarPushEmLote } = await import("@/lib/web-push.server");
    const sent = await enviarPushEmLote(alvos, { title, body, url, tag });

    await supabaseAdmin
      .from("convocacoes_entregadores" as any)
      .update({ destinatarios: alvos.length, enviados: sent })
      .eq("id", (reserva as any).id);

    return { sent, destinatarios: alvos.length };
  });
