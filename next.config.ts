import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Incrémenter pour forcer la purge des caches des anciens service workers.
const SW_CACHE_VERSION = "v11";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  // Repli uniquement quand la navigation échoue réellement (pas un app shell servi pour toute route).
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    cacheId: `bv-rh-${SW_CACHE_VERSION}`,
    cleanupOutdatedCaches: true,
    // Seule la page hors-ligne est pré-cachée : les pages HTML pré-cachées pointaient vers des chunks supprimés après déploiement.
    additionalManifestEntries: [{ url: "/offline", revision: SW_CACHE_VERSION }],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/auth/"),
        handler: "NetworkOnly",
      },
      {
        // Données authentifiées : jamais en cache SW (clé = URL seule, ignore Authorization).
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin &&
          (url.pathname.startsWith("/api/nest/") || url.pathname.startsWith("/api/set-token")),
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\/_next\/data\/.*\.json$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "rsc-cache",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 3600,
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-media-cache",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 86400,
          },
        },
      },
    ],
  },
});

const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bvback.onrender.com";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ??
  (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.60"],
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["electron"],
  async rewrites() {
    const target = apiProxyTarget.replace(/\/$/, "");
    return [
      {
        source: "/uploads/:path*",
        destination: `${target}/uploads/:path*`,
      },
      {
        source: "/api/nest/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
