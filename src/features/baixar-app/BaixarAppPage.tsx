import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthCard } from "@/components/AuthCard";
import { useBaixarApp } from "./hooks/use-baixar-app";
import { AppHeader } from "./components/AppHeader";
import { DownloadSection } from "./components/DownloadSection";
import { AdminUpload } from "./components/AdminUpload";

export function BaixarAppPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("super_admin");
  const { apks, loading, downloading, uploading, handleDownload, handleUpload } =
    useBaixarApp(authLoading);

  return (
    <AuthCard
      title="BAIXE O APP"
      subtitle="Instale o aplicativo ROTA 66 direto no seu celular Android"
      footer={
        user ? (
          <Link to="/entregador" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
            Ir para o painel <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        )
      }
    >
      <AppHeader />

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
      ) : (
        <DownloadSection
          apks={apks}
          downloading={downloading}
          isAdmin={isAdmin}
          onDownload={handleDownload}
        />
      )}

      {isAdmin && <AdminUpload uploading={uploading} onUpload={handleUpload} />}
    </AuthCard>
  );
}
