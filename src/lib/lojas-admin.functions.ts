import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CriarInput = {
  email: string;
  senha: string;
  nome_responsavel: string;
  nome_loja: string;
  telefone?: string;
  city_id: string;
};

function slugify(nome: string): string {
  const base =
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "loja";
  const suffix =
    globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`;
}

/**
 * Determina a cidade permitida para o usuário atual:
 * - super_admin OWNER (sem franqueados_config e sem vínculo): permite qualquer cidade
 * - franqueado (com franqueados_config): permite só a cidade dele
 * - colaborador (vinculado a um franqueado): permite só a cidade do franqueado dono
 * - admin comum: permite qualquer cidade
 * Retorna null quando não há restrição.
 */
async function cidadePermitida(context: any): Promise<string | null> {
  const uid = context.userId as string;

  const { data: cfg } = await context.supabase
    .from("franqueados_config")
    .select("cidade")
    .eq("user_id", uid)
    .maybeSingle();
  if (cfg?.cidade) return String(cfg.cidade);

  const { data: vinc } = await context.supabase
    .from("franqueado_colaboradores")
    .select("franqueado_user_id")
    .eq("colaborador_user_id", uid)
    .eq("ativo", true)
    .maybeSingle();
  if (vinc?.franqueado_user_id) {
    const { data: cfg2 } = await context.supabase
      .from("franqueados_config")
      .select("cidade")
      .eq("user_id", vinc.franqueado_user_id)
      .maybeSingle();
    if (cfg2?.cidade) return String(cfg2.cidade);
  }

  return null; // owner/admin: qualquer cidade
}

export const criarLojaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriarInput) => data)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    const senha = data.senha.trim();
    const nomeResp = data.nome_responsavel.trim();
    const nomeLoja = data.nome_loja.trim();
    const telefone = (data.telefone ?? "").trim();
    const cityId = data.city_id;

    if (!email) throw new Error("Informe um e-mail");
    if (senha.length < 8) throw new Error("Senha deve ter pelo menos 8 caracteres");
    if (!nomeResp) throw new Error("Informe o nome do responsável");
    if (!nomeLoja) throw new Error("Informe o nome da loja");
    if (!cityId) throw new Error("Selecione a cidade");

    // Verifica se caller pode criar loja: super_admin, admin ou colaborador ativo
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roleList = (roles ?? []).map((r: any) => String(r.role));
    const isSuper = roleList.includes("super_admin");
    const isAdmin = roleList.includes("admin");

    let colab = false;
    if (!isSuper && !isAdmin) {
      const { data: v } = await context.supabase
        .from("franqueado_colaboradores")
        .select("id")
        .eq("colaborador_user_id", context.userId)
        .eq("ativo", true)
        .maybeSingle();
      colab = !!v;
    }
    if (!isSuper && !isAdmin && !colab) {
      throw new Error("Sem permissão para cadastrar lojas");
    }

    // Busca cidade + valida escopo
    const { data: cidade, error: errCid } = await context.supabase
      .from("cidades")
      .select("id, nome, uf")
      .eq("id", cityId)
      .maybeSingle();
    if (errCid || !cidade) throw new Error("Cidade inválida");

    const restricao = await cidadePermitida(context);
    if (restricao && restricao.toLowerCase() !== String(cidade.nome).toLowerCase()) {
      throw new Error(`Você só pode cadastrar lojas em ${restricao}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica se e-mail já existe
    let uid: string | null = null;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const existing = existingList?.users?.find(
      (u: any) => (u.email ?? "").toLowerCase() === email,
    );

    if (existing) {
      uid = existing.id;
      // Se já tem loja, erro
      const { data: lojaExist } = await supabaseAdmin
        .from("lojas")
        .select("id")
        .eq("owner_id", uid!)
        .maybeSingle();
      if (lojaExist) throw new Error("Este e-mail já possui uma loja cadastrada.");
    } else {
      const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { full_name: nomeResp },
      });
      if (errCreate || !created?.user) {
        throw new Error(errCreate?.message ?? "Falha ao criar usuário");
      }
      uid = created.user.id;
    }

    // Garante role loja_admin (idempotente)
    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: uid!, role: "loja_admin" as any },
        { onConflict: "user_id,role" },
      );
    if (errRole) throw new Error(errRole.message);

    // Atualiza profile
    await supabaseAdmin.from("profiles").upsert(
      {
        id: uid!,
        full_name: nomeResp,
        phone: telefone || null,
      } as any,
      { onConflict: "id" },
    );

    // Identifica quem está criando
    const criadoPorTipo = isSuper ? "super_admin" : isAdmin ? "franqueado" : "colaborador";
    const { data: criadorProfile } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();

    // Cria loja
    const slug = slugify(nomeLoja);
    const { data: loja, error: errLoja } = await supabaseAdmin
      .from("lojas")
      .insert({
        owner_id: uid!,
        nome: nomeLoja,
        slug,
        telefone: telefone || null,
        city_id: cidade.id,
        cidade: cidade.nome,
        estado: cidade.uf,
        status: "aprovado",
        criado_por: context.userId,
        criado_por_tipo: criadoPorTipo,
        criado_por_nome: (criadorProfile as any)?.full_name ?? null,
      } as any)
      .select("id")
      .single();
    if (errLoja || !loja) throw new Error(errLoja?.message ?? "Falha ao criar loja");


    return { loja_id: loja.id, user_id: uid };
  });
