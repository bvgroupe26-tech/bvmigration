import Script from "next/script";

/** Enregistre /sw.js avant React — corrige sw:0 quand next-pwa/workbox charge tard. */
export default function RegisterServiceWorkerScript() {
  return (
    <Script id="bv-register-sw" strategy="beforeInteractive">
      {`
(function () {
  if (!("serviceWorker" in navigator)) return;
  if (window.__bvSwRegisterPromise) return;
  window.__bvSwRegisterPromise = navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(function (err) {
      console.error("[BV PWA] SW register:", err);
      throw err;
    });
})();
      `.trim()}
    </Script>
  );
}
