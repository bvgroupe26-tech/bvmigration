"use client";

import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deletePieceJointe, uploadPieceJointe } from "@/lib/budget-api";
import { formatFileSize } from "@/lib/budget-depense-utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import type { PieceJointe } from "@/lib/types-finance";

const ACCEPT = "application/pdf,image/jpeg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  depenseId: number;
  pieces: PieceJointe[];
  editable: boolean;
  required?: boolean;
  onChanged: () => void;
};

export default function PiecesJointes({ depenseId, pieces, editable, required, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PieceJointe | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!ACCEPT.split(",").includes(file.type)) {
          toast.error(`« ${file.name} » : formats acceptés PDF, JPG, PNG.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`« ${file.name} » dépasse 10 Mo.`);
          continue;
        }
        await uploadPieceJointe(depenseId, file);
        toast.success(`« ${file.name} » ajouté`);
      }
      onChanged();
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDel(true);
    try {
      await deletePieceJointe(deleting.id);
      toast.success("Pièce supprimée");
      setDeleting(null);
      onChanged();
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setBusyDel(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Paperclip className="h-4 w-4 text-slate-400" />
          Pièces justificatives
          {required ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
              Obligatoire au-delà du seuil
            </span>
          ) : null}
        </h3>
        {editable ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Upload className="h-3.5 w-3.5" />}
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Ajouter
            </Button>
          </>
        ) : null}
      </div>

      {pieces.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
          Aucune pièce jointe (facture, reçu…).
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {pieces.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-[#2F5F9D] hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{p.nom}</span>
                {p.taille ? <span className="shrink-0 text-[11px] text-slate-400">{formatFileSize(p.taille)}</span> : null}
              </a>
              {editable ? (
                <button
                  type="button"
                  onClick={() => setDeleting(p)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Supprimer ${p.nom}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette pièce ?"
        description={deleting ? `« ${deleting.nom} » sera retirée de la dépense.` : ""}
        confirmLabel="Supprimer"
        loading={busyDel}
      />
    </div>
  );
}
