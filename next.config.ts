import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  fallbacks: {
    document: "/offline",
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
