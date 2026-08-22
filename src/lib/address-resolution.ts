// address-resolution.ts
import { geocodificarEndereco } from "./frete.functions";

/**
 * Resolve um endereço textual para coordenadas e endereço formatado usando Mapbox.
 */
export async function resolveAddressToPlace(address: string) {
  const res = await geocodificarEndereco({ data: { endereco: address } });
  if (res.success && res.lat && res.lng) {
    return { address: res.address || address, lat: res.lat, lng: res.lng };
  }
  throw new Error("Local não encontrado");
}
