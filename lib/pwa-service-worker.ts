const SW_PATH = "/sw.js";

type WorkboxWindow = {
  register: () => Promise<ServiceWorkerRegistration>;
};

function getWorkbox(): WorkboxWindow | null {
  if (typeof window === "undefined") return null;
  const workbox = (window as Window & { workbox?: WorkboxWindow }).workbox;
  return workbox?.register ? workbox : null;
}

/** Enregistre le SW dès le chargement (next-pwa workbox ou fallback /sw.js). */
export async function bootstrapServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const workbox = getWorkbox();
    if (workbox) {
      return await workbox.register();
    }
  } catch {
    /* fallback ci-dessous */
  }

  const existing = await navigator.serviceWorker.getRegistrations();
  if (existing.length > 0) {
    return existing.find((reg) => reg.active) ?? existing[0] ?? null;
  }

  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs[0] ?? null;
  }
}

export async function waitForControllingServiceWorker(
  maxWaitMs = 20_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  await bootstrapServiceWorker();

  if (navigator.serviceWorker.controller) {
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      /* continue */
    }
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + maxWaitMs;
    let settled = false;

    const finish = async () => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);

      const regs = await navigator.serviceWorker.getRegistrations();
      const reg = regs.find((r) => r.active) ?? regs[0] ?? null;
      resolve(reg);
    };

    const onControllerChange = () => {
      void finish();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void (async () => {
      try {
        const ready = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(() => r(null), Math.min(5_000, maxWaitMs))),
        ]);
        if (ready && !settled) {
          settled = true;
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          resolve(ready);
          return;
        }
      } catch {
        /* ignore */
      }

      const remaining = Math.max(0, deadline - Date.now());
      setTimeout(() => void finish(), remaining);
    })();
  });
}
