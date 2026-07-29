import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AnunciosEntregador() {
  const { data: anuncios } = useQuery({
    queryKey: ["anuncios-entregador"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,

    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("anuncios_entregador")
        .select("id,titulo,image_data_url,link_url,expira_em")
        .eq("ativo", true)
        .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        titulo: string | null;
        image_data_url: string;
        link_url: string | null;
      }>;
    },
  });

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!anuncios || anuncios.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % anuncios.length), 6000);
    return () => clearInterval(t);
  }, [anuncios]);

  if (!anuncios || anuncios.length === 0) return null;

  const safeIdx = idx % anuncios.length;
  const a = anuncios[safeIdx];

  const content = (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card">
      <img
        src={a.image_data_url}
        alt={a.titulo ?? "Anúncio"}
        className="w-full h-auto object-cover block"
      />
    </div>
  );

  return (
    <div className="mt-6">
      {a.link_url ? (
        <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      ) : (
        content
      )}
      {anuncios.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {anuncios.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIdx ? "bg-primary w-6" : "bg-muted w-1.5"
              }`}
              aria-label={`Anúncio ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
