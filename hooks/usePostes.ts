"use client";

import { useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { getUserErrorMessage } from "@/lib/fetcher";
import {
  POSTES_REFERENTIEL_PATH,
  addPosteReferentiel,
  fetchPostesReferentiel,
  migrateLegacyPostes,
  removePosteReferentiel,
} from "@/lib/postes-referentiel";

/** Référentiel des postes partagé (base de données). Les postes des fiches employé y sont fusionnés côté API. */
export function usePostes() {
  const { data, error, isLoading, mutate } = useSWR<string[]>(
    POSTES_REFERENTIEL_PATH,
    fetchPostesReferentiel,
    { revalidateOnFocus: false }
  );
  const migrated = useRef(false);

  useEffect(() => {
    if (!data || migrated.current) return;
    migrated.current = true;
    migrateLegacyPostes(data)
      .then((next) => {
        if (next) void mutate(next, { revalidate: false });
      })
      .catch(() => {
        /* migration best-effort : retentée au prochain chargement si le stockage local subsiste */
        migrated.current = false;
      });
  }, [data, mutate]);

  const addPoste = useCallback(
    async (label: string) => {
      const next = await addPosteReferentiel(label);
      await mutate(next, { revalidate: false });
      return next;
    },
    [mutate]
  );

  const removePoste = useCallback(
    async (label: string) => {
      const next = await removePosteReferentiel(label);
      await mutate(next, { revalidate: false });
      return next;
    },
    [mutate]
  );

  return {
    postes: data ?? [],
    isLoading,
    error: error ? getUserErrorMessage(error) : null,
    addPoste,
    removePoste,
    refresh: () => mutate(),
  };
}
