import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { openPicture } from "./heic";
import { JobProgress } from "./JobProgress";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
interface Job { id: string; fileName: string; status: JobStatus; draftId: string | null; draftTitle: string | null; draftStatus: string | null; flags: string[]; error: string | null; createdAt: string; progress: number | null; step: string | null; startedAt: string | null; heardAt?: string | null; alreadyInShop: string | null }
interface Worker { id: string; label: string; lastSeen: string | null; online: boolean; canCreateListings: boolean; note?: string | null; working: number }
interface Listing { jobs: Job[]; counts: Record<JobStatus, number>; workers: Worker[] }

const LABEL: Record<JobStatus, string> = { queued: "Waiting", running: "Being worked on", done: "Draft ready", failed: "Problem", cancelled: "Cancelled" };
const MAX_PHOTOS = 40;
/** A photo being worked on with no report for this long: the photo computer may have stopped. */
const QUIET_MS = 3 * 60_000;
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.floor(min / 60)} h ago` : `${Math.floor(min / 1440)} days ago`;
};
const MAX_BYTES = 4.8 * 1024 * 1024;

/** A photo as a JPEG that is small enough to send: phone photos are big, and iPhone ones are HEIC, which is converted here. Null if it cannot be read. */
async function preparePhoto(file: File): Promise<File | null> {
  try {
    const bitmap = await openPicture(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let blob: Blob | null = null;
    for (const quality of [0.92, 0.85, 0.78, 0.7]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob || blob.size > MAX_BYTES) return null;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * "Make drafts from photos": the admin picks photos of products that are not in the shop yet. The photo computer (the Gleamshelf app on the shop's own computer) cleans each
 * photo, reads the box, looks the product up on the web and writes a draft: title, description, category and series. The drafts appear in the list below to be checked;
 * the price and stock are always typed by a person.
 */
export function ListingUploads({ ctx, onChanged }: { ctx: Ctx; onChanged: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"product" | "character">("product");
  const [enlarge, setEnlarge] = useState(true);
  const [state, setState] = useState<Listing | null>(null);
  // the shop server could not be reached on the last look: said on screen (not just flashed once), and looked at again until it answers
  const [unreachable, setUnreachable] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { setState(await api<Listing>("/admin/listing-jobs")); setUnreachable(false); }
    catch (e) { if ((e as { status?: number }).status === 0) setUnreachable(true); else ctx.flash(errMsg(e)); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const active = !!state && state.counts.queued + state.counts.running > 0;
  const runningNow = (state?.counts.running ?? 0) > 0;
  // while photos are waiting or being worked on, look again every 20 seconds, and refresh the drafts when something finishes
  const finished = state?.counts.done ?? 0;
  const lastFinished = useRef(finished);
  useEffect(() => {
    if (finished !== lastFinished.current) { lastFinished.current = finished; onChanged(); }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active && !unreachable) return;
    // a photo being worked on: look every 5 seconds, so its progress bar moves; otherwise (and while the server is not answering) every 20
    const t = setInterval(() => { void load(); }, runningNow ? 5_000 : 20_000);
    return () => clearInterval(t);
  }, [active, runningNow, unreachable, load]);

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setPreparing(true);
    const ready: File[] = [...files];
    const bad: string[] = [];
    for (const f of [...list]) {
      if (ready.length >= MAX_PHOTOS) { bad.push(`${f.name} (at most ${MAX_PHOTOS} photos at a time)`); continue; }
      const p = await preparePhoto(f);
      if (p) ready.push(p); else bad.push(f.name);
    }
    setFiles(ready); setUnreadable(bad); setPreparing(false);
    if (input.current) input.current.value = "";
  };

  const send = async () => {
    if (!files.length) return;
    setSending(true);
    try {
      const form = new FormData();
      for (const f of files) form.append("photos", f, f.name);
      form.append("options", JSON.stringify({ mode, enlarge }));
      const r = await api<{ queued: number }>("/admin/listing-jobs", { method: "POST", body: form });
      ctx.flash(worker
        ? `${r.queued} photo${r.queued === 1 ? "" : "s"} sent to the photo computer`
        : `${r.queued} photo${r.queued === 1 ? "" : "s"} saved, but no photo computer can write drafts right now: they wait in line until one can (see the note above)`);
      setFiles([]); setUnreadable([]);
      await load();
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setSending(false); }
  };
  const act = async (id: string, what: "cancel" | "retry") => {
    try { await api(`/admin/listing-jobs/${id}/${what}`, { method: "POST" }); await load(); } catch (e) { ctx.flash(errMsg(e)); }
  };

  const worker = state?.workers.find((w) => w.online && w.canCreateListings);
  // connected, but cannot write drafts right now (web search down, no vision model): it says why
  const limited = !worker ? state?.workers.find((w) => w.online) : undefined;
  const lastSeen = state?.workers[0] ?? null;
  // place in line of each waiting photo (oldest first)
  const line = new Map((state?.jobs ?? []).filter((j) => j.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((j, i) => [j.id, i]));
  const waitingLabel = (j: Job) => {
    if (!worker) return limited ? "Waiting: photo computer can't write drafts" : "Waiting: no photo computer";
    const ahead = line.get(j.id) ?? 0;
    return ahead ? `Waiting · ${ahead} ahead` : "Next in line";
  };
  const quietFor = (j: Job) => (j.status === "running" && j.heardAt ? Date.now() - Date.parse(j.heardAt) : 0);
  const recent = (state?.jobs ?? []).filter((j) => j.status !== "cancelled" || Date.now() - Date.parse(j.createdAt) < 86_400_000).slice(0, 40);
  return (
    <section className="ad-card ad-uploads">
      <div className="ad-uploads__head">
        <b>Make drafts from photos</b>
        <span className="ad-muted ad-sm">Pick photos of products that are not in the shop yet. Each becomes a draft below, with a cleaned photo, title, description, category and series. You type the price and stock.</span>
      </div>

      {unreachable && (
        <div className="ad-uploads__status is-down" role="alert">
          <span className="ad-dot" style={{ background: "var(--red)" }} />
          <span><b>Can't reach the shop server.</b> It may be starting up or down. This list is checked again every 20 seconds and updates by itself when it answers.</span>
        </div>
      )}
      <div className={`ad-uploads__status ${worker ? "is-on" : "is-off"}`} role="status">
        <span className="ad-dot" style={{ background: worker ? "#3fbf92" : limited ? "#d9a400" : "var(--red)" }} />
        {worker
          ? <span><b>{worker.label}</b> is connected and can write drafts{worker.working ? ` (working on ${worker.working} now)` : ""}.</span>
          : limited
            ? <span><b>{limited.label}</b> is connected but cannot write drafts right now{limited.note ? `: ${limited.note}` : " (it only improves photos)"}. Photos you send wait in line until it can.</span>
            : <span><b>The photo computer is off or not connected</b>{lastSeen ? ` (last seen ${ago(lastSeen.lastSeen)}, ${lastSeen.label})` : ""}. Photos you send wait in line until it is on: on the shop's photo computer, run <code>npm run worker</code> in the Gleamshelf folder and leave it open.</span>}
      </div>

      <div className="ad-uploads__pick">
        <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { void pick(e.target.files); }} />
        <button type="button" className="sh-btn sh-btn--ghost" onClick={() => input.current?.click()} disabled={preparing || sending}>{preparing ? "Reading photos…" : files.length ? "Add more photos" : "Choose photos"}</button>
        {files.length > 0 && <span className="ad-muted">{files.length} photo{files.length === 1 ? "" : "s"} ready</span>}
      </div>
      {unreadable.length > 0 && <div className="ad-uploads__warn">These could not be read, so they are left out (they may be damaged or not photos): {unreadable.join(", ")}</div>}
      {files.length > 0 && (
        <>
          <div className="ad-uploads__files">{files.map((f, i) => (
            <span key={f.name + i} className="ad-uploads__file">{f.name}<button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button></span>
          ))}</div>
          <div className="ad-uploads__options">
            <label className="ad-check"><input type="radio" name="up-mode" checked={mode === "product"} onChange={() => setMode("product")} /> Keep the whole box <small className="ad-muted">(recommended: every detail on the cover stays)</small></label>
            <label className="ad-check"><input type="radio" name="up-mode" checked={mode === "character"} onChange={() => setMode("character")} /> Only the character on the cover</label>
            <label className="ad-check"><input type="checkbox" checked={enlarge} onChange={(e) => setEnlarge(e.target.checked)} /> Make the picture sharper and bigger <small className="ad-muted">(best quality, takes longer)</small></label>
          </div>
          <div className="ad-imports__actions">
            <button type="button" className="sh-btn" onClick={send} disabled={sending || preparing}>{sending ? "Sending…" : `Send ${files.length} photo${files.length === 1 ? "" : "s"} to the photo computer`}</button>
            <button type="button" className="sh-btn sh-btn--ghost" onClick={() => { setFiles([]); setUnreadable([]); }} disabled={sending}>Clear</button>
          </div>
        </>
      )}

      {recent.length > 0 && (
        <div className="ad-uploads__jobs">
          <div className="ad-label">Photos sent{active ? " (updates by itself)" : ""}</div>
          {recent.map((j) => (
            <div key={j.id} className={`ad-uploads__job is-${j.status}`}>
              <span className="ad-uploads__name">{j.draftTitle ?? j.fileName}</span>
              {j.status === "running" ? <JobProgress progress={j.progress} step={j.step} startedAt={j.startedAt} /> : <span className={`sh-chip ad-photoq__chip is-${j.status === "done" ? "done" : j.status === "failed" ? "failed" : j.status === "queued" && !worker ? "failed" : ""}`}>{j.status === "queued" ? waitingLabel(j) : LABEL[j.status]}</span>}
              {quietFor(j) > QUIET_MS && <span className="ad-sm" style={{ color: "var(--gold)" }}>No word from the photo computer for {Math.round(quietFor(j) / 60_000)} min. If it stopped, this photo goes back in line within an hour.</span>}
              {j.status === "done" && j.draftStatus && j.draftStatus !== "draft" && <span className="ad-muted ad-sm">{j.draftStatus === "added" ? "added to the shop" : "rejected"}</span>}
              {j.status === "done" && j.alreadyInShop && <span className="sh-chip ad-photoq__chip is-running" title={j.alreadyInShop}>Already in the shop?</span>}
              {j.status === "failed" && <span className="ad-sm" style={{ color: "var(--red)" }}>{j.error}</span>}
              {j.status === "queued" && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => act(j.id, "cancel")}>Cancel</button>}
              {j.status === "failed" && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => act(j.id, "retry")}>Try again</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
