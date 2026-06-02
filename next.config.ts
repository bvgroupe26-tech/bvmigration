import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const OFFLINE_ASSETS_REVISION = "2";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  /** Évite de mettre en cache les navigations RSC (souvent en cause sur mobile après déploiement). */
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
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
      /^\/manifest\.webmanifest$/,
      /^\/icons\//,
      /^\/favicon/,
      /\/.*\.[a-zA-Z0-9]+$/,
    ],
    additionalManifestEntries: [
      { url: "/offline", revision: OFFLINE_ASSETS_REVISION },
      { url: "/login", revision: OFFLINE_ASSETS_REVISION },
      { url: "/dashboard", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employes", revision: OFFLINE_ASSETS_REVISION },
      { url: "/presence", revision: OFFLINE_ASSETS_REVISION },
      { url: "/paie", revision: OFFLINE_ASSETS_REVISION },
      { url: "/budget", revision: OFFLINE_ASSETS_REVISION },
      { url: "/profile", revision: OFFLINE_ASSETS_REVISION },
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
  turbopack: {},
  serverExternalPackages: ["better-sqlite3", "electron"],
  async rewrites() {
    return [
      {
        source: "/api/nest/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
