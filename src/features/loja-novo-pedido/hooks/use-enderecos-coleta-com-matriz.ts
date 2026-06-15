import { useMemo } from "react";
import { useEnderecosColeta } from "@/components/EnderecosColetaManager";

export function useEnderecosColetaComMatriz(loja: any | undefined) {
  const { data: enderecosColeta = [] } = useEnderecosColeta(loja?.id);

  return useMemo(() => {
    const matrizEndereco = (loja?.endereco ?? "").trim();
    const matrizLat = (loja as any)?.endereco_lat ?? null;
    const matrizLng = (loja as any)?.endereco_lng ?? null;
    const algumSalvoPadrao = enderecosColeta.some((e) => e.padrao);

    const enderecosComMatriz = matrizEndereco
      ? [
          {
            id: "__matriz__",
            loja_id: loja!.id,
            rotulo: "Matriz",
            endereco: matrizEndereco,
            lat: matrizLat,
            lng: matrizLng,
            padrao: !algumSalvoPadrao,
          },
          ...enderecosColeta.map((e) =>
            algumSalvoPadrao ? e : { ...e, padrao: false },
          ),
        ]
      : enderecosColeta;

    return { matrizEndereco, enderecosColeta, enderecosComMatriz };
  }, [loja, enderecosColeta]);
}
