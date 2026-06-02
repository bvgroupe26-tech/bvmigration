"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { cn, getAvatarGradient, getInitials } from "@/lib/utils";

type ProfilePhotoEditorProps = {
  nom: string;
  prenom?: string | null;
  photoUrl?: string | null;
  uploading?: boolean;
  onPickFile: (file: File | undefined) => void;
  size?: "md" | "lg";
  editable?: boolean;
};

const SIZES = {
  md: { box: "h-20 w-20 text-2xl rounded-2xl", camera: "h-8 w-8", icon: "h-4 w-4" },
  lg: { box: "h-24 w-24 text-3xl rounded-2xl", camera: "h-9 w-9", icon: "h-4 w-4" },
};

export default function ProfilePhotoEditor({
  nom,
  prenom,
  photoUrl,
  uploading = false,
  onPickFile,
  size = "lg",
  editable = true,
}: ProfilePhotoEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(nom, prenom);
  const gradient = getAvatarGradient(`${prenom ?? ""}${nom}`);
  const dims = SIZES[size];
  const showPhoto = Boolean(photoUrl) && !imgError;

  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const avatarNode = (
    <div
      className={cn(
        "relative mx-auto overflow-hidden bg-gradient-to-br font-display font-bold text-white shadow-md",
        dims.box,
        !showPhoto && gradient
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials}</span>
      )}
      {uploading ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
          …
        </span>
      ) : null}
    </div>
  );

  if (!editable) {
    return <div className="relative mx-auto block w-fit">{avatarNode}</div>;
  }

  return (
    <div className="relative mx-auto w-fit">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="relative block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F5F9D]"
        aria-label="Changer la photo de profil"
      >
        {avatarNode}
        <span
          className={cn(
            "absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full border-2 border-white bg-[#2F5F9D] text-white shadow",
            dims.camera
          )}
        >
          <Camera className={dims.icon} aria-hidden />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
