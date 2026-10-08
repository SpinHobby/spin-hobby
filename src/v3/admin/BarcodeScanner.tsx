import { useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";
import { setZXingModuleOverrides } from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { useEscape } from "../hooks";
import { cleanBarcode } from "./barcode";

// The decoder ships its own WebAssembly file; serve it from our own site rather than a CDN.
setZXingModuleOverrides({ locateFile: (path, prefix) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) });

const FORMATS = ["ean_13", "ean_8", "upc_a"] as const;

/**
 * Reads a product barcode with the camera (live), or from a photo of it. Works on iPhone, Android and desktop
 * webcams. Only a code whose check digit is right is accepted, so a misread never gets through.
 * Nothing is uploaded or saved: the picture is decoded in the browser and thrown away.
 */
export default function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  useEscape(onClose);
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Starting the camera…");
  const [live, setLive] = useState(false);
  const detector = useRef<BarcodeDetector | null>(null);
  detector.current ??= new BarcodeDetector({ formats: [...FORMATS] });

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    const scan = async () => {
      const el = video.current;
      if (stopped || !el || !detector.current) return;
      if (el.readyState >= 2) {
        try {
          for (const hit of await detector.current.detect(el)) {
            const code = cleanBarcode(hit.rawValue);
            if (code) { onCode(code); return; }
          }
        } catch { /* a frame that cannot be read is skipped */ }
      }
      timer = window.setTimeout(scan, 150);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setMessage("This browser can't open the camera here. Take a photo of the barcode instead."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (video.current) { video.current.srcObject = stream; await video.current.play().catch(() => undefined); }
        setLive(true);
        setMessage("Point the camera at the barcode and hold steady.");
        scan();
      } catch {
        setMessage("The camera isn't available (allow camera access, or take a photo of the barcode instead).");
      }
    })();
    return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);

  const fromPhoto = async (file: File | undefined) => {
    if (!file || !detector.current) return;
    setMessage("Reading the photo…");
    try {
      const bitmap = await createImageBitmap(file);
      for (const hit of await detector.current.detect(bitmap)) {
        const code = cleanBarcode(hit.rawValue);
        if (code) { onCode(code); return; }
      }
      setMessage("No readable barcode in that photo. Get closer, keep it flat and well lit, then try again.");
    } catch {
      setMessage("That photo couldn't be read. Try another.");
    }
  };

  return (
    <div className="ad-modal-backdrop" onClick={onClose}>
      <div className="ad-modal ad-scan" role="dialog" aria-modal="true" aria-label="Scan barcode" onClick={(e) => e.stopPropagation()}>
        <h2 className="ad-h3">Scan barcode</h2>
        <div className="ad-scan__view">
          <video ref={video} playsInline muted aria-label="Camera" />
          {live && <span className="ad-scan__line" aria-hidden />}
        </div>
        <p className="ad-muted ad-sm" role="status">{message}</p>
        <div className="ad-modal__actions">
          <label className="sh-btn sh-btn--ghost">
            Take or choose a photo
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void fromPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
