import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/geo";

type Opcoes = {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
};

const DEFAULT_OPCOES: Required<Opcoes> = {
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 10_000,
};

export function useGeolocalizacao(opcoes: Opcoes = {}) {
  const [posicao, setPosicao] = useState<LatLng | null>(null);
  const [erro, setErro] = useState<GeolocationPositionError | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const config = { ...DEFAULT_OPCOES, ...opcoes };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setErro(null);
      },
      (e) => setErro(e),
      config,
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcoes.enableHighAccuracy, opcoes.maximumAge, opcoes.timeout]);

  return { posicao, erro };
}
