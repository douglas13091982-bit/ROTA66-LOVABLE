import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withSignedProdutoImages } from "@/lib/produto-image";
import type { Produto } from "@/routes/-catalogo-types";

export function useLojaPublica(slug: string) {
  return useQuery({
    queryKey: ["catalogo-loja", slug],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      const lojaSelect =
        "id, nome, slug, catalogo_slug, telefone, endereco, endereco_lat, endereco_lng, cidade, estado, logo_url, taxa_entrega_base, catalogo_ativo, ativa, status, catalogo_layout, horario_funcionamento, catalogo_retirada_ativa";

      const { data, error } = await (supabase as any)
        .from("lojas_publicas")
        .select(lojaSelect)
        .eq("catalogo_slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      const { data: lojaPorSlug, error: slugError } = await (supabase as any)
        .from("lojas_publicas")
        .select(lojaSelect)
        .eq("slug", slug)
        .maybeSingle();
      if (slugError) throw slugError;
      return lojaPorSlug;
    },
  });
}

export function useProdutosCatalogo(lojaId: string | undefined, catalogoAtivo: boolean) {
  return useQuery({
    queryKey: ["catalogo-produtos", lojaId],
    enabled: !!lojaId && catalogoAtivo,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("produtos")
        .select(
          "id, nome, descricao, preco, preco_promocional, preco_promocional_ate, imagem_url, categoria, adicionais_grupos:produto_adicional_grupos(id, nome, obrigatorio, min_escolhas, max_escolhas, ordem, opcoes:produto_adicional_opcoes(id, nome, preco, ativo, ordem))",
        )
        .eq("loja_id", lojaId!)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      const produtos = (data as any[]).map((p) => ({
        ...p,
        adicionais_grupos: ((p.adicionais_grupos ?? []) as any[])
          .map((g) => ({
            ...g,
            opcoes: ((g.opcoes ?? []) as any[])
              .filter((o) => o.ativo)
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
          }))
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
      })) as Produto[];
      return await withSignedProdutoImages(produtos);
    },
  });
}

export function useCatalogoConfig() {
  return useQuery({
    queryKey: ["catalogo-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_roteirizacao" as any)
        .select("catalogo_horizontal_min_produtos, catalogo_horizontal_min_categorias")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        catalogo_horizontal_min_produtos: number;
        catalogo_horizontal_min_categorias: number;
      } | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMpPublicConfig(lojaId: string) {
  return useQuery({
    queryKey: ["mp-public-config", lojaId],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_mp_public_config", { _loja_id: lojaId });
      const row = (data && data[0]) ?? null;
      return row as { public_key: string; ativo: boolean } | null;
    },
  });
}
