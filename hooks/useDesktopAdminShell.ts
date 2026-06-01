"use client";

import { useEffect, useState } from "react";
import { isStandaloneMode } from "@/lib/pwa-install";

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Active le shell admin « bureau » (sidebar + contenu large) comme dans le navigateur.
 * En PWA installée sur PC, le layout desktop s’active dès 768px de largeur réelle.
 */
export function useDesktopAdminShell(): boolean {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const width = window.innerWidth;
      const standalone = isStandaloneMode();
      const mobileUa = isMobileUserAgent();

      setDesktop(width >= 1024 || (standalone && !mobileUa && width >= 768));
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);

  return desktop;
}
