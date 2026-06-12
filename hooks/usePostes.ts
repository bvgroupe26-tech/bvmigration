"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addStoredPoste,
  mergePostesFromStrings,
  readStoredPostes,
  removeStoredPoste,
} from "@/lib/postes-referentiel";
import { useEmployes } from "@/hooks/api";

export function usePostes() {
  const [postes, setPostes] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const { employes, isLoading: loadingEmployes } = useEmployes({ limit: 500 });

  const refresh = useCallback(() => {
    setPostes(readStoredPostes());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!employes.length) return;
    const merged = mergePostesFromStrings(employes.map((e) => e.poste));
    setPostes(merged);
    setReady(true);
  }, [employes]);

  const addPoste = useCallback((label: string) => {
    const next = addStoredPoste(label);
    setPostes(next);
    return next;
  }, []);

  const removePoste = useCallback((label: string) => {
    const next = removeStoredPoste(label);
    setPostes(next);
    return next;
  }, []);

  return {
    postes,
    isLoading: !ready || loadingEmployes,
    error: null as string | null,
    addPoste,
    removePoste,
    refresh,
  };
}
