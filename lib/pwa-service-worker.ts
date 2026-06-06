const SW_PATH = "/sw.js";

type WorkboxWindow = {
  register: () => Promise<ServiceWorkerRegistration>;
};

function getWorkbox(): WorkboxWindow | null {
  if (typeof window === "undefined") return null;
  const workbox = (window as Window & { workbox?: WorkboxWindow }).workbox;
  return workbox?.register ? workbox : null;
}

async function getAnyRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return null;
  return registrations.find((reg) => reg.active) ?? registrations[0] ?? null;
}

function waitForWorkerState(
  worker: ServiceWorker,
  timeoutMs: number
): Promise<boolean> {
  if (worker.state === "activated") return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const onChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        clearTimeout(timer);
        worker.removeEventListener("statechange", onChange);
        resolve(worker.state === "activated");
      }
    };
    worker.addEventListener("statechange", onChange);
  });
}

/** Enregistre le SW (workbox next-pwa ou fallback /sw.js). */
export async function bootstrapServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const existing = await getAnyRegistration();
  if (existing) return existing;

  try {
    const workbox = getWorkbox();
    if (workbox) {
      return await workbox.register();
    }
  } catch {
    /* fallback */
  }

  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    return getAnyRegistration();
  }
}

/**
 * Résout une registration utilisable pour PushManager.
 * Ne bloque pas sur navigator.serviceWorker.ready (peut pendre sans controller).
 */
export async function resolvePushServiceWorkerRegistration(
  maxWaitMs = 8_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  await bootstrapServiceWorker();

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const registration = await getAnyRegistration();
    if (registration) {
      if (registration.active) return registration;

      const worker = registration.installing || registration.waiting;
      if (worker) {
        await waitForWorkerState(worker, Math.min(3_000, deadline - Date.now()));
        if (registration.active) return registration;
      }

      if (registration.pushManager) return registration;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const last = await getAnyRegistration();
  return last?.pushManager ? last : null;
}
