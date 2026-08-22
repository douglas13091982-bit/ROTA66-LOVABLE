// Migrated to Mapbox. See address-autocomplete.functions.ts and mapbox.functions.ts.
export async function resolveAddressToPlace(address: string) {
  const { geocodificarEndereco } = await import("./frete.functions");
  const res = await geocodificarEndereco({ data: { endereco: address } });
  if (res.success && res.lat && res.lng) {
    return { address: res.address || address, lat: res.lat, lng: res.lng };
  }
  throw new Error("Local não encontrado");
}
