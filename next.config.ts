import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const OFFLINE_ASSETS_REVISION = "10";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  cacheOnFrontEndNav: true,
  /** Désactivé : évite de servir une mauvaise page HTML en cache sur les routes dynamiques (/employee/paie/:id). */
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    navigateFallback: "/offline",
    navigateFallbackDenylist: [
      /^\/api\//,
      /^\/_next\//,
      /^\/login/,
      /^\/administration\//,
      /^\/manifest\.webmanifest$/,
      /^\/icons\//,
      /^\/favicon/,
      /^\/employee\/paie\//,
      /^\/paie\/\d+/,
      /\/.*\.[a-zA-Z0-9]+$/,
    ],
    additionalManifestEntries: [
      { url: "/", revision: OFFLINE_ASSETS_REVISION },
      { url: "/offline", revision: OFFLINE_ASSETS_REVISION },
      { url: "/login", revision: OFFLINE_ASSETS_REVISION },
      { url: "/dashboard", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employes", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employes/nouveau", revision: OFFLINE_ASSETS_REVISION },
      { url: "/presence", revision: OFFLINE_ASSETS_REVISION },
      { url: "/paie", revision: OFFLINE_ASSETS_REVISION },
      { url: "/budget", revision: OFFLINE_ASSETS_REVISION },
      { url: "/recrutement", revision: OFFLINE_ASSETS_REVISION },
      { url: "/notifications", revision: OFFLINE_ASSETS_REVISION },
      { url: "/profile", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/dashboard", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/presence", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/leaves", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/documents", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/profile", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/notifications", revision: OFFLINE_ASSETS_REVISION },
    ],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/auth/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin && url.pathname.startsWith("/api/nest/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-nest-cache",
          networkTimeoutSeconds: 15,
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 3600,
          },
        },
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
const DEFAULT_PROD_API = "https://bv-groupe.onrender.com";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ??
  (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.60"],
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["better-sqlite3", "electron"],
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
