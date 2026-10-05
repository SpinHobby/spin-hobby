import { AtelierEditorModal, type AtelierResult } from "@atelier/react";
import "@atelier/react/style.css";

/**
 * The Atelier photo editor, full screen. Loaded on demand from PhotoUploader so shoppers never download it.
 * Exports within the upload limits: WebP, 1200 px (1600 for homepage slides), under 5 MB.
 */
export default function PhotoEditor({ url, folder, onDone, onCancel }: {
  url: string;
  folder: "products" | "slides";
  onDone: (result: AtelierResult) => void;
  onCancel: () => void;
}) {
  return (
    <AtelierEditorModal
      open
      source={url}
      exportOptions={{ maxSize: folder === "slides" ? 1600 : 1200, type: "image/webp", quality: 0.82, maxBytes: 5_000_000 }}
      doneLabel="Save photo"
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}
