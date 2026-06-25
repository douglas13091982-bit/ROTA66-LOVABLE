import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntregadorShell } from "@/components/EntregadorShell";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useLogout } from "@/features/logout/logic/use-logout";
import { PerfilHeader } from "./components/PerfilHeader";
import { StatsRow } from "./components/StatsRow";
import { MenuList } from "./components/MenuList";
import { LogoutButton } from "./components/LogoutButton";
import { InfoSection } from "./components/sections/InfoSection";
import { PagamentosSection } from "./components/sections/PagamentosSection";
import { IndicacaoSection } from "./components/sections/IndicacaoSection";
import { SegurancaSection } from "./components/sections/SegurancaSection";
import { AjudaSection } from "./components/sections/AjudaSection";
import { ConfigSection } from "./components/sections/ConfigSection";
import { useAvatarUpload } from "./hooks/use-avatar-upload";
import { usePerfilEntregador } from "./hooks/use-perfil-entregador";
import { useLojasVinculo, usePerfilStats } from "./hooks/use-perfil-stats";
import { formatIdCurto, formatTempo } from "./logic/format";
import type { MenuKey, SectionKey } from "./logic/types";

export function PerfilPage() {
  const { user } = useAuth();
  const { signOut, loading: sairLoading } = useLogout();
  const navigate = useNavigate();
  const { suporteWhatsapp, suporteHorario } = useBranding();

  const perfil = usePerfilEntregador(user?.id);
  const avatar = useAvatarUpload({
    userId: user?.id,
    onUploaded: (path) => perfil.setAvatarUrl(path),
    refetchProfile: () => perfil.refetchProfile(),
  });
  const { data: stats } = usePerfilStats(user?.id);
  const { data: lojas } = useLojasVinculo(user?.id);

  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const tempo = useMemo(() => formatTempo((user as any)?.created_at), [user]);
  const idCurto = useMemo(() => formatIdCurto(user?.id), [user]);

  // Espelha o input picker dentro do Header para "Tirar foto" / "Da galeria" do InfoSection
  function pickFromCamera() {
    cameraRef.current?.click();
  }
  function pickFromGallery() {
    galleryRef.current?.click();
  }

  function renderSection(key: Exclude<MenuKey, "carteira" | "mensalidade">) {
    switch (key) {
      case "info":
        return (
          <InfoSection
            fullName={perfil.fullName}
            setFullName={perfil.setFullName}
            phone={perfil.phone}
            setPhone={perfil.setPhone}
            email={user?.email ?? ""}
            tipoVeiculo={perfil.tipoVeiculo}
            savingVeiculo={perfil.savingVeiculo}
            onSalvarVeiculo={perfil.salvarVeiculo}
            uploadingAvatar={avatar.uploading}
            onTirarFoto={pickFromCamera}
            onAbrirGaleria={pickFromGallery}
            onSalvar={perfil.salvar}
            saving={perfil.saving}
          />
        );
      case "pagamentos":
        return (
          <PagamentosSection
            pixChave={perfil.pixChave}
            setPixChave={perfil.setPixChave}
            onSalvar={perfil.salvar}
            saving={perfil.saving}
            onVerHistorico={() => navigate({ to: "/entregador/historico" })}
          />
        );
      case "seguranca":
        return <SegurancaSection email={user?.email} />;
      case "indicacao":
        return <IndicacaoSection codigo={perfil.codigoIndicacao} />;
      case "ajuda":
        return (
          <AjudaSection suporteWhatsapp={suporteWhatsapp} suporteHorario={suporteHorario} />
        );
      case "config":
        return (
          <ConfigSection
            aceitaExternos={perfil.aceitaExternos}
            savingExternos={perfil.savingExternos}
            onToggleExternos={perfil.toggleExternos}
            lojas={lojas}
          />
        );
    }
  }

  return (
    <EntregadorShell title="Perfil">
      <div className="max-w-md mx-auto pb-4">
        <PerfilHeader
          fullName={perfil.fullName}
          idCurto={idCurto}
          avatarUrl={perfil.avatarUrl}
          uploading={avatar.uploading}
          onPickFile={avatar.upload}
        />

        {/* Inputs ocultos espelhados, usados pelo InfoSection */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            avatar.upload(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            avatar.upload(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        <StatsRow entregas={stats?.entregas ?? 0} tempo={tempo} />

        <MenuList
          openSection={openSection}
          setOpenSection={setOpenSection}
          renderSection={renderSection}
        />

        <LogoutButton loading={sairLoading} onClick={signOut} />
      </div>
    </EntregadorShell>
  );
}
