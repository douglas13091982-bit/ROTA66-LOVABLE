import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AvaliacaoResumo {
  media: number;
  total: number;
}

export function useAvaliacoesLojas(lojaIds: string[]) {
  const [resumos, setResumos] = useState<Map<string, AvaliacaoResumo>>(new Map());

  useEffect(() => {
    if (lojaIds.length === 0) {
      setResumos(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("loja_avaliacoes")
        .select("loja_id,nota")
        .in("loja_id", lojaIds);
      if (cancelled || error || !data) return;
      const acc = new Map<string, { soma: number; total: number }>();
      data.forEach((r: any) => {
        const cur = acc.get(r.loja_id) ?? { soma: 0, total: 0 };
        cur.soma += Number(r.nota) || 0;
        cur.total += 1;
        acc.set(r.loja_id, cur);
      });
      const out = new Map<string, AvaliacaoResumo>();
      acc.forEach((v, k) => out.set(k, { media: v.soma / v.total, total: v.total }));
      setResumos(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [lojaIds.join("|")]);

  return resumos;
}
