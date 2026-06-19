import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProdutoIn = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().trim().max(1000).nullable().optional(),
  preco: z.number().min(0).max(99999),
  categoria: z.string().trim().max(120).nullable().optional(),
  imagem_url: z.string().trim().max(1000).nullable().optional(),
  ordem: z.number().int().min(0).max(100000).optional(),
});

const Input = z.object({
  loja_id: z.string().uuid(),
  produtos: z.array(ProdutoIn).min(1).max(2000),
});

const MAX_IMG_BYTES = 4 * 1024 * 1024;

async function baixarImagem(url: string): Promise<{ bytes: Uint8Array; contentType: string; ext: string } | null> {
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_IMG_BYTES) return null;
    const ext = ct === "image/png" ? "png" : ct === "image/webp" ? "webp" : ct === "image/gif" ? "gif" : "jpg";
    return { bytes: buf, contentType: ct, ext };
  } catch {
    return null;
  }
}

export const importarCatalogoIfood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: loja, error: lojaErr } = await supabase
      .from("lojas")
      .select("id, owner_id")
      .eq("id", data.loja_id)
      .maybeSingle();
    if (lojaErr) throw new Error(lojaErr.message);
    if (!loja || loja.owner_id !== userId) throw new Error("Loja não encontrada ou sem permissão");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: antigos } = await supabaseAdmin
      .from("produtos")
      .select("id, imagem_url")
      .eq("loja_id", data.loja_id);
    const pathsAntigos = (antigos ?? [])
      .map((p) => {
        const u = p.imagem_url;
        if (!u) return null;
        const m = u.match(/\/object\/(?:public|sign)\/produtos\/([^?]+)/);
        if (m) return decodeURIComponent(m[1]);
        if (!/^https?:\/\//i.test(u)) return u.replace(/^\/+/, "");
        return null;
      })
      .filter((p): p is string => !!p);
    if (pathsAntigos.length) {
      await supabaseAdmin.storage.from("produtos").remove(pathsAntigos);
    }
    await supabaseAdmin.from("produtos").delete().eq("loja_id", data.loja_id);

    const rows: Array<Record<string, any>> = [];
    let comImagem = 0;
    let semImagem = 0;
    const CONCURRENCY = 6;

    async function processarUm(p: z.infer<typeof ProdutoIn>, idx: number) {
      let imagem_path: string | null = null;
      if (p.imagem_url && /^https?:\/\//i.test(p.imagem_url)) {
        const img = await baixarImagem(p.imagem_url);
        if (img) {
          const path = `${data.loja_id}/${crypto.randomUUID()}.${img.ext}`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("produtos")
            .upload(path, img.bytes, { contentType: img.contentType, upsert: false });
          if (!upErr) {
            imagem_path = path;
            comImagem++;
          } else {
            semImagem++;
          }
        } else {
          semImagem++;
        }
      }
      rows.push({
        loja_id: data.loja_id,
        nome: p.nome,
        descricao: p.descricao ?? null,
        preco: p.preco,
        categoria: p.categoria ?? null,
        imagem_url: imagem_path,
        ativo: true,
        ordem: p.ordem ?? idx,
      });
    }

    for (let i = 0; i < data.produtos.length; i += CONCURRENCY) {
      const lote = data.produtos.slice(i, i + CONCURRENCY);
      await Promise.all(lote.map((p, j) => processarUm(p, i + j)));
    }

    for (let i = 0; i < rows.length; i += 500) {
      const lote = rows.slice(i, i + 500);
      const { error } = await (supabaseAdmin as any).from("produtos").insert(lote);
      if (error) throw new Error(error.message);
    }

    return { total: rows.length, com_imagem: comImagem, sem_imagem: semImagem };
  });
