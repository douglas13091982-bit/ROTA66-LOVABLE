import { useMemo, useState } from "react";
import type { LojaPublica } from "../logic/types";

export function useLojasFiltro(lojas: LojaPublica[]) {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");

  const filtradas = useMemo(() => {
    let result = lojas;
    const t = busca.trim().toLowerCase();
    if (t) result = result.filter((l) => l.nome.toLowerCase().includes(t));
    if (categoriaFiltro) result = result.filter((l) => l.categoria === categoriaFiltro);
    return result;
  }, [lojas, busca, categoriaFiltro]);

  return { busca, setBusca, categoriaFiltro, setCategoriaFiltro, filtradas };
}
