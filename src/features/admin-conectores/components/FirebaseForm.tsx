import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FirebaseConfig } from "../logic/types";

interface Props {
  initialData?: Partial<FirebaseConfig>;
  onSave: (data: FirebaseConfig) => void;
  isLoading: boolean;
}

export function FirebaseForm({ initialData, onSave, isLoading }: Props) {
  const [form, setForm] = useState<FirebaseConfig>({
    apiKey: initialData?.apiKey || "",
    authDomain: initialData?.authDomain || "",
    projectId: initialData?.projectId || "",
    storageBucket: initialData?.storageBucket || "",
    messagingSenderId: initialData?.messagingSenderId || "",
    appId: initialData?.appId || "",
    measurementId: initialData?.measurementId || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input 
            value={form.apiKey} 
            onChange={e => setForm({...form, apiKey: e.target.value})}
            placeholder="AIzaSy..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Project ID</Label>
          <Input 
            value={form.projectId} 
            onChange={e => setForm({...form, projectId: e.target.value})}
            placeholder="my-project-123"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Auth Domain</Label>
          <Input 
            value={form.authDomain} 
            onChange={e => setForm({...form, authDomain: e.target.value})}
            placeholder="project.firebaseapp.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Storage Bucket</Label>
          <Input 
            value={form.storageBucket} 
            onChange={e => setForm({...form, storageBucket: e.target.value})}
            placeholder="project.appspot.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Messaging Sender ID</Label>
          <Input 
            value={form.messagingSenderId} 
            onChange={e => setForm({...form, messagingSenderId: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>App ID</Label>
          <Input 
            value={form.appId} 
            onChange={e => setForm({...form, appId: e.target.value})}
          />
        </div>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full bg-[#cc2229] hover:bg-[#AE0000]">
        {isLoading ? "Salvando..." : "Salvar Configuração Firebase"}
      </Button>
    </form>
  );
}
