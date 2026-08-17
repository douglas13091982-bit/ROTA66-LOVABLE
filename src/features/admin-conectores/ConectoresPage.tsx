import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FirebaseForm } from "./components/FirebaseForm";
import { GoogleCloudForm } from "./components/GoogleCloudForm";
import { Share2, Cloud, Flame } from "lucide-react";
import { toast } from "sonner";

export function ConectoresPage() {
  const [loading, setLoading] = useState(false);

  const handleSaveFirebase = async (data: any) => {
    setLoading(true);
    // Simulação de salvamento - no mundo real salvaria no Supabase/Backend
    console.log("Salvando Firebase:", data);
    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações do Firebase atualizadas!");
    }, 1000);
  };

  const handleSaveGoogleCloud = async (data: any) => {
    setLoading(true);
    console.log("Salvando Google Cloud:", data);
    setTimeout(() => {
      setLoading(false);
      toast.success("Configurações do Google Cloud atualizadas!");
    }, 1000);
  };

  return (
    <AdminShell title="Conectores Cloud">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Integrações Cloud
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as credenciais e conectores do Firebase e Google Cloud Platform para serviços de push, storage e APIs.
          </p>
        </div>

        <Tabs defaultValue="firebase" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0d2c54]/10">
            <TabsTrigger value="firebase" className="flex items-center gap-2 data-[state=active]:bg-[#cc2229] data-[state=active]:text-white">
              <Flame className="h-4 w-4" />
              Firebase
            </TabsTrigger>
            <TabsTrigger value="google_cloud" className="flex items-center gap-2 data-[state=active]:bg-[#cc2229] data-[state=active]:text-white">
              <Cloud className="h-4 w-4" />
              Google Cloud
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="firebase" className="mt-6">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Configurações Firebase</CardTitle>
                <CardDescription>
                  Utilizado para notificações Push (FCM) e autenticação social.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FirebaseForm onSave={handleSaveFirebase} isLoading={loading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google_cloud" className="mt-6">
            <Card className="border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Google Cloud Platform</CardTitle>
                <CardDescription>
                  Configurações de Service Account para acesso a APIs do Google Maps, Routes e Storage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleCloudForm onSave={handleSaveGoogleCloud} isLoading={loading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
