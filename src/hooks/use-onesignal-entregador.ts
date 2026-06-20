import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setOneSignalExternalId, clearOneSignalExternalId } from "@/lib/onesignal";

/**
 * Mantém o external_id do OneSignal alinhado com o user.id do entregador
 * logado. Roda só no client e é no-op fora do APK / sem bridge.
 */
export function useOneSignalEntregador() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      setOneSignalExternalId(user.id);
    } else {
      clearOneSignalExternalId();
    }
  }, [user?.id]);
}
