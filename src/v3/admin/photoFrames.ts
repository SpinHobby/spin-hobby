import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { PhotoFrame } from "../photo";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * A product's photo positions (Admin > product > Photos > ⤧ Position): where each photo sits in its square on the shop. Loads them,
 * keeps which photo is being positioned, and saves one. Only a photo already saved to the product can be positioned.
 */
export function usePhotoFrames(productId: string | null | undefined) {
  const [frames, setFrames] = useState<Record<string, PhotoFrame>>({});
  const [framing, setFraming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const base = productId ? `/admin/products/${encodeURIComponent(productId)}` : null;

  useEffect(() => {
    if (!base) return;
    let current = true;
    api<{ frames: Record<string, PhotoFrame> }>(`${base}/photo-frames`)
      .then((r) => current && setFrames(r.frames))
      .catch(() => undefined); // without them every photo just sits in the middle
    return () => {
      current = false;
    };
  }, [base]);

  /** Saves where `url` sits; true when it worked. */
  const save = useCallback(
    async (url: string, frame: PhotoFrame) => {
      if (!base) return false;
      setSaving(true);
      setError("");
      try {
        const r = await api<{ frames: Record<string, PhotoFrame> }>(`${base}/photo-frame`, {
          method: "PUT",
          body: JSON.stringify({ url, ...frame }),
        });
        setFrames(r.frames);
        setFraming(null);
        return true;
      } catch (e) {
        setError(errMsg(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  return { frames, framing, setFraming, saving, error, save };
}
