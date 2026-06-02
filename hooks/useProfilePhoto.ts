"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadAvatar } from "@/hooks/employee";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { normalizeEmployeMe } from "@/lib/employe-utils";
import {
  avatarCacheKey,
  clearLocalProfileAvatar,
  fileToAvatarDataUrl,
  readLocalProfileAvatar,
  writeLocalProfileAvatar,
} from "@/lib/avatar-utils";

export function useProfilePhoto() {
  const { user, refreshSession } = useAuth();
  const employeLinked = Boolean(user?.employeId);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState<string | null>(null);
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
  const photoUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    const version = avatarVersion ?? employe?.updated_at ?? null;
    return avatarCacheKey(rawAvatar, version);
  }, [previewUrl, rawAvatar, avatarVersion, employe?.updated_at]);

  const uploadPhoto = useCallback(
    async (file: File | undefined) => {
      if (!file || !user) return;
      setUploading(true);
      let optimisticPreview: string | null = null;
      try {
        optimisticPreview = await fileToAvatarDataUrl(file);
        setPreviewUrl(optimisticPreview);

        if (employeLinked) {
          await uploadAvatar(file);
          clearLocalProfileAvatar(user.id);
          setAvatarVersion(String(Date.now()));
          await mutateEmploye();
          await refreshSession();
        } else {
          writeLocalProfileAvatar(user.id, optimisticPreview);
          setLocalAvatar(optimisticPreview);
        }
      } catch (err) {
        setPreviewUrl(null);
        throw err;
      } finally {
        setUploading(false);
        setPreviewUrl(null);
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
