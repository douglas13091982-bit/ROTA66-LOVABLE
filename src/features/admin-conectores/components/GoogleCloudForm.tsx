import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GoogleCloudConfig } from "../logic/types";

interface Props {
  initialData?: Partial<GoogleCloudConfig>;
  onSave: (data: GoogleCloudConfig) => void;
  isLoading: boolean;
}

export function GoogleCloudForm({ initialData, onSave, isLoading }: Props) {
  const [form, setForm] = useState<GoogleCloudConfig>({
    projectId: initialData?.projectId || "",
    clientEmail: initialData?.clientEmail || "",
    privateKey: initialData?.privateKey || "",
    region: initialData?.region || "us-central1",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Project ID</Label>
          <Input 
            value={form.projectId} 
            onChange={e => setForm({...form, projectId: e.target.value})}
            placeholder="gcp-project-id"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Client Email</Label>
          <Input 
            value={form.clientEmail} 
            onChange={e => setForm({...form, clientEmail: e.target.value})}
            placeholder="service-account@project.iam.gserviceaccount.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Private Key</Label>
          <Textarea 
            value={form.privateKey} 
            onChange={e => setForm({...form, privateKey: e.target.value})}
            placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
            className="font-mono text-xs h-32"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Region</Label>
          <Input 
            value={form.region} 
            onChange={e => setForm({...form, region: e.target.value})}
            placeholder="us-central1"
          />
        </div>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-[#cc2229] hover:bg-[#AE0000]">
        {isLoading ? "Salvando..." : "Salvar Configuração Google Cloud"}
      </Button>
    </form>
  );
}
