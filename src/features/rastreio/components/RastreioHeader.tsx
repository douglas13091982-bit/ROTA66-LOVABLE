interface Props {
  logoUrl: string;
  nomeSistema: string;
  lojaNome: string;
  numero: string | number;
  clienteNome: string;
}

export function RastreioHeader({ logoUrl, nomeSistema, lojaNome, numero, clienteNome }: Props) {
  return (
    <>
      <div className="flex justify-center pt-4">
        <img src={logoUrl} alt={nomeSistema} className="h-16 w-auto object-contain" />
      </div>
      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{lojaNome}</p>
        <h1 className="font-display text-3xl tracking-wide">Pedido #{numero}</h1>
        <p className="text-sm text-muted-foreground mt-1">Olá, {clienteNome}</p>
      </header>
    </>
  );
}
