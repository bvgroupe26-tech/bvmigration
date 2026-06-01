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
  const { employes } = useEmployes({ limit: 500 });

  const refresh = useCallback(() => {
    setPostes(readStoredPostes());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!employes.length) return;
    const merged = mergePostesFromStrings(employes.map((e) => e.poste));
    setPostes(merged);
  }, [employes]);

  const addPoste = useCallback(
    (label: string) => {
      const next = addStoredPoste(label);
      setPostes(next);
      return next;
    },
    []
  );

  const removePoste = useCallback(
    (label: string) => {
      const next = removeStoredPoste(label);
      setPostes(next);
      return next;
    },
    []
  );

  return { postes, addPoste, removePoste, refresh };
}
