"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadAvatar } from "@/hooks/employee";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { normalizeEmployeMe } from "@/lib/employe-utils";
import {
  clearLocalProfileAvatar,
  fileToAvatarDataUrl,
  readLocalProfileAvatar,
  resolveAvatarUrl,
  writeLocalProfileAvatar,
} from "@/lib/avatar-utils";

export function useProfilePhoto() {
  const { user, refreshSession } = useAuth();
  const employeLinked = Boolean(user?.employeId);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: employe, mutate: mutateEmploye } = useSWR(
    employeLinked ? "/employes/me" : null,
    async () => normalizeEmployeMe(await fetcher<unknown>("/employes/me")),
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (!user?.id) return;
    setLocalAvatar(readLocalProfileAvatar(user.id));
  }, [user?.id]);

  const rawAvatar = employe?.avatar ?? user?.avatar ?? localAvatar;
  const photoUrl = useMemo(() => resolveAvatarUrl(rawAvatar), [rawAvatar]);

  const uploadPhoto = useCallback(
    async (file: File | undefined) => {
      if (!file || !user) return;
      setUploading(true);
      try {
        if (employeLinked) {
          await uploadAvatar(file);
          clearLocalProfileAvatar(user.id);
          await mutateEmploye();
          await refreshSession();
        } else {
          const dataUrl = await fileToAvatarDataUrl(file);
          writeLocalProfileAvatar(user.id, dataUrl);
          setLocalAvatar(dataUrl);
        }
      } finally {
        setUploading(false);
      }
    },
    [employeLinked, mutateEmploye, refreshSession, user]
  );

  return {
    user,
    photoUrl,
    uploading,
    uploadPhoto,
    usesLocalOnly: !employeLinked,
    employeLinked,
  };
}
