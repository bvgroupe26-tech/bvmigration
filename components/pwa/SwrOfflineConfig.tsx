"use client";

import { SWRConfig } from "swr";
import { offlineFetcher } from "@/lib/fetcher/offlineFetcher";
import { useOnlineStatus } from "@/hooks/useOfflineStatus";

export function SwrOfflineConfig({ children }: { children: React.ReactNode }) {
  const { isOnline } = useOnlineStatus();

  return (
    <SWRConfig
      value={{
        fetcher: offlineFetcher,
        revalidateOnFocus: isOnline,
        revalidateOnReconnect: true,
        shouldRetryOnError: isOnline,
      }}
    >
      {children}
    </SWRConfig>
  );
}
