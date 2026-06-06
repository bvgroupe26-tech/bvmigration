const SW_PATH = "/sw.js";
const SW_SCOPE = "/";
const MAX_REGISTER_ATTEMPTS = 5;

type WorkboxWindow = {
  register: () => Promise<ServiceWorkerRegistration>;
};

declare global {
  interface Window {
    __bvSwRegisterPromise?: Promise<ServiceWorkerRegistration>;
    workbox?: WorkboxWindow;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getWorkbox(): WorkboxWindow | null {
  if (typeof window === "undefined") return null;
  return window.workbox?.register ? window.workbox : null;
}

async function getAnyRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return null;
  return registrations.find((reg) => reg.active) ?? registrations[0] ?? null;
}

function waitForWorkerState(worker: ServiceWorker, timeoutMs: number): Promise<boolean> {
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

async function registerDirectly(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: SW_SCOPE,
    updateViaCache: "none",
  });

  const worker = registration.installing || registration.waiting;
  if (worker && !registration.active) {
    await waitForWorkerState(worker, 12_000);
  }

  return registration;
}

/** Lance l'enregistrement /sw.js (appelé par le script inline + React). */
export function startServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (window.__bvSwRegisterPromise) {
    return window.__bvSwRegisterPromise.catch(() => bootstrapServiceWorker());
  }

  window.__bvSwRegisterPromise = (async () => {
    const existing = await getAnyRegistration();
    if (existing) return existing;

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_REGISTER_ATTEMPTS; attempt += 1) {
      try {
        return await registerDirectly();
      } catch (error) {
        lastError = error;
        await sleep(400 * (attempt + 1));
      }

      const workbox = getWorkbox();
      if (workbox) {
        try {
          return await workbox.register();
        } catch (error) {
          lastError = error;
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[BV PWA] Échec enregistrement service worker:", lastError);
    }

    const fallback = await getAnyRegistration();
    if (fallback) return fallback;

    throw lastError instanceof Error
      ? lastError
      : new Error("Enregistrement du service worker impossible");
  })();

  return window.__bvSwRegisterPromise.catch(async () => {
    const reg = await getAnyRegistration();
    return reg;
  });
}

/** Enregistre le SW (workbox next-pwa ou fallback /sw.js). */
export async function bootstrapServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await startServiceWorkerRegistration();
  } catch {
    return getAnyRegistration();
  }
}

/**
 * Résout une registration utilisable pour PushManager.
 * Ne bloque pas sur navigator.serviceWorker.ready (peut pendre sans controller).
 */
export async function resolvePushServiceWorkerRegistration(
  maxWaitMs = 10_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    await startServiceWorkerRegistration();
  } catch {
    /* retry loop below */
  }

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const registration = await getAnyRegistration();
    if (registration) {
      if (registration.active) return registration;

      const worker = registration.installing || registration.waiting;
      if (worker) {
        await waitForWorkerState(worker, Math.min(4_000, deadline - Date.now()));
        if (registration.active) return registration;
      }

      if (registration.pushManager) return registration;
    }

    if (!window.__bvSwRegisterPromise) {
      void startServiceWorkerRegistration();
    }

    await sleep(250);
  }

  const last = await getAnyRegistration();
  return last?.pushManager ? last : null;
}

export async function getServiceWorkerRegistrationCount(): Promise<number> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return 0;
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.length;
}
