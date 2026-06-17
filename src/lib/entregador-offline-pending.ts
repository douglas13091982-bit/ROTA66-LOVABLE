const STORAGE_PREFIX = "entregador-offline-pending:";

export const ENTREGADOR_OFFLINE_PENDING_EVENT = "entregador-offline-pending-change";

type OfflinePendingEventDetail = {
  userId: string;
  pending: boolean;
};

function keyFor(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getEntregadorOfflinePending(userId: string | null | undefined): boolean {
  if (!userId || !canUseStorage()) return false;
  return window.localStorage.getItem(keyFor(userId)) === "1";
}

export function setEntregadorOfflinePending(userId: string, pending: boolean) {
  if (!canUseStorage()) return;
  if (pending) {
    window.localStorage.setItem(keyFor(userId), "1");
  } else {
    window.localStorage.removeItem(keyFor(userId));
  }
  window.dispatchEvent(
    new CustomEvent<OfflinePendingEventDetail>(ENTREGADOR_OFFLINE_PENDING_EVENT, {
      detail: { userId, pending },
    }),
  );
}

export function subscribeEntregadorOfflinePending(
  userId: string | null | undefined,
  callback: (pending: boolean) => void,
) {
  if (!userId || typeof window === "undefined") return () => {};

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<OfflinePendingEventDetail>).detail;
    if (detail?.userId === userId) callback(detail.pending);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === keyFor(userId)) callback(event.newValue === "1");
  };

  window.addEventListener(ENTREGADOR_OFFLINE_PENDING_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ENTREGADOR_OFFLINE_PENDING_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}