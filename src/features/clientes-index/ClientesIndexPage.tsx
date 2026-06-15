import { useBranding } from "@/hooks/use-branding";
import { useRedirectCidadeCliente } from "./hooks/use-redirect-cidade-cliente";
import { LoadingEstado } from "./components/LoadingEstado";
import { GuestEstado } from "./components/GuestEstado";
import { SemCidadeEstado } from "./components/SemCidadeEstado";

export function ClientesIndexPage() {
  const { logoUrl, nomeSistema } = useBranding();
  const status = useRedirectCidadeCliente();

  return (
    <div className="catalogo-clean min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <img src={logoUrl} alt={nomeSistema} className="h-10 w-auto object-contain mb-6" />
        {status === "loading" && <LoadingEstado />}
        {status === "guest" && <GuestEstado />}
        {status === "no-city" && <SemCidadeEstado />}
      </div>
    </div>
  );
}
