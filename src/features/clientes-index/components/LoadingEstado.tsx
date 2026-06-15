export function LoadingEstado() {
  return (
    <>
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">Localizando sua cidade…</p>
    </>
  );
}
