import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete, type AddressSelection } from "@/components/AddressAutocomplete";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function maskTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
    );
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export function PerfilDialog({
  children,
  open: openProp,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (v: boolean) => {
    setOpenInternal(v);
    onOpenChange?.(v);
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    endereco: "",
    cidade: "",
    estado: "",
    endereco_lat: null as number | null,
    endereco_lng: null as number | null,
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Faça login para editar seu perfil");
        setOpen(false);
        setLoading(false);
        return;
      }
      const meta = (auth.user.user_metadata ?? {}) as Record<string, any>;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, endereco, cidade, estado, endereco_lat, endereco_lng")
        .eq("id", auth.user.id)
        .maybeSingle();
      const p = (data as any) ?? {};
      setForm({
        full_name: p.full_name ?? meta.full_name ?? meta.name ?? "",
        phone: p.phone ?? meta.phone ?? "",
        endereco: p.endereco ?? meta.endereco ?? "",
        cidade: p.cidade ?? meta.cidade ?? "",
        estado: p.estado ?? meta.estado ?? "",
        endereco_lat: typeof p.endereco_lat === "number" ? p.endereco_lat : null,
        endereco_lng: typeof p.endereco_lng === "number" ? p.endereco_lng : null,
      });
      setLoading(false);
    })();
  }, [open]);

  const onSave = async () => {
    if (!form.cidade.trim()) return toast.error("Informe sua cidade");
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }
    const cidade = form.cidade.trim().replace(/\s+/g, " ");
    const estado = form.estado.trim().toUpperCase().slice(0, 2);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: auth.user.id,
        full_name: form.full_name.trim().slice(0, 100) || null,
        phone: form.phone.replace(/\D/g, "").slice(0, 11) || null,
        endereco: form.endereco.trim().slice(0, 200) || null,
        cidade,
        estado: estado || null,
        endereco_lat: form.endereco_lat,
        endereco_lng: form.endereco_lng,
      }, { onConflict: "id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    setOpen(false);
    navigate({
      to: "/clientes/$cidade",
      params: { cidade: encodeURIComponent(cidade) },
      search: estado ? { uf: estado } : {},
      replace: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserRound className="h-4 w-4" /> Meu cadastro
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Seu nome"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={maskTelefone(form.phone)}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
                maxLength={16}
              />
            </div>
            <div>
              <Label className="text-xs">Endereço</Label>
              <AddressAutocomplete
                value={form.endereco}
                onChange={(v) => setForm((f) => ({ ...f, endereco: v }))}
                onSelect={(s: AddressSelection) =>
                  setForm((f) => ({
                    ...f,
                    endereco: s.endereco,
                    cidade: s.cidade || f.cidade,
                    estado: s.estado || f.estado,
                    endereco_lat: s.lat,
                    endereco_lng: s.lng,
                  }))
                }
                placeholder="Rua, número, bairro"
              />
              {form.endereco_lat != null && form.endereco_lng != null && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Localização capturada — frete será calculado a partir daqui.
                </p>
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <Label className="text-xs">Cidade *</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Sua cidade"
                  maxLength={80}
                />
              </div>
              <div className="w-20">
                <Label className="text-xs">UF</Label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">--</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={onSave} disabled={saving} className="w-full mt-2">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
