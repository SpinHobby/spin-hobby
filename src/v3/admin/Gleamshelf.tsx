import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useGleamshelfComputers, type GleamshelfComputer } from "./gleamshelfComputers";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** A Gleamshelf app connected to the shop (one pairing: it does every kind of Gleamshelf work the shop asks for). */
interface Connection {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/** One line on whether a Gleamshelf computer is on, for the places that send it work. */
export function GleamshelfStatusLine({ computers, ctx }: { computers: GleamshelfComputer[] | null; ctx: Ctx }) {
  if (!computers) return <span className="ad-muted ad-sm">Checking the Gleamshelf computer…</span>;
  const on = computers.filter((c) => c.online);
  if (on.length)
    return (
      <span className="ad-sm">
        <span className="ad-dot" style={{ background: "#3fbf92" }} /> Gleamshelf is on: {on.map((c) => c.label).join(", ")}
        {on.some((c) => c.working) ? " (working)" : ""}.
      </span>
    );
  return (
    <span className="ad-sm">
      <span className="ad-dot" style={{ background: "var(--gold)" }} /> No Gleamshelf computer is on
      {computers.length ? ` (last seen ${ago(computers[0]?.lastSeen ?? null)})` : ""}: the work waits until one is.{" "}
      <button type="button" className="ad-link" onClick={() => ctx.go("Gleamshelf")}>
        {computers.length ? "Gleamshelf" : "Connect one"}
      </button>
    </span>
  );
}

/**
 * Admin > Gleamshelf: the photo studio app on the shop's own computer, connected once for everything it does for the shop: drafts from new
 * photos (Imports), cleaner photos and new titles, descriptions, series, makers and categories for products already in the shop (Products >
 * Redo with Gleamshelf, checked in Photos and Descriptions). Shows each connected computer and what it can do now; the owner connects one here.
 */
export function GleamshelfScreen({ ctx }: { ctx: Ctx }) {
  const computers = useGleamshelfComputers();
  return (
    <>
      <div className="ad-toolbar">
        <div className="ad-muted ad-sm" style={{ flex: "1 1 320px" }}>
          <b>Gleamshelf</b> runs on the shop&rsquo;s own computer. Connected once, it does all of its work for the shop: drafts from new
          photos, cleaner photos, and new titles, descriptions, series, makers and categories for products already for sale. Nothing changes
          on the shop until a person checks the result.
        </div>
      </div>

      <section className="ad-card ad-gleam__computers">
        <div className="ad-label">Connected computers</div>
        {!computers && <div className="ad-muted ad-sm">Loading…</div>}
        {computers?.length === 0 && (
          <div className="ad-muted ad-sm">
            None yet. {ctx.isOwner ? "Connect the Gleamshelf app below." : "Ask the owner to connect the Gleamshelf app."}
          </div>
        )}
        {computers?.map((c) => (
          <div key={c.id} className="ad-gleam__computer">
            <span className="ad-dot" style={{ background: c.online ? "#3fbf92" : "var(--gold)" }} />
            <div>
              <b>{c.label}</b>{" "}
              <span className="ad-muted ad-sm">
                {c.online ? (c.working ? "on, working" : "on, waiting for work") : `off · last seen ${ago(c.lastSeen)}`}
              </span>
              {c.online && (
                <div className="ad-sm">
                  Can do now: improve photos
                  {c.canCleanPhotos ? ", clean product photos" : ""}
                  {c.canCreateListings ? ", titles, descriptions and drafts" : ""}.
                </div>
              )}
              {c.online && c.note && <div className="ad-muted ad-sm">{c.note}</div>}
            </div>
          </div>
        ))}
      </section>

      <section className="ad-card ad-gleam__uses">
        <div className="ad-label">What it does here</div>
        <ul className="ad-sm">
          <li>
            <button type="button" className="ad-link" onClick={() => ctx.go("Products")}>
              Products
            </button>
            : tick products and press <b>Redo with Gleamshelf</b> to clean their photos or write a new title, description, series and maker,
            or category.
          </li>
          <li>
            <button type="button" className="ad-link" onClick={() => ctx.go("Imports")}>
              Imports
            </button>
            : drafts of new products from photos you upload.
          </li>
          <li>
            <button type="button" className="ad-link" onClick={() => ctx.go("Photos")}>
              Photos
            </button>{" "}
            and{" "}
            <button type="button" className="ad-link" onClick={() => ctx.go("Descriptions")}>
              Descriptions
            </button>
            : check what it made and apply it.
          </li>
        </ul>
      </section>

      {ctx.isOwner ? (
        <ConnectPanel ctx={ctx} />
      ) : (
        <p className="ad-muted ad-sm">Only the owner can connect or disconnect a Gleamshelf app.</p>
      )}
    </>
  );
}

/** Owner only: a one-time code to connect a Gleamshelf app, and the apps connected now (each can be disconnected). */
function ConnectPanel({ ctx }: { ctx: Ctx }) {
  const [code, setCode] = useState<{ code: string; expiresAt: string; server: string } | null>(null);
  const [apps, setApps] = useState<Connection[]>([]);
  const refresh = useCallback(
    () =>
      api<{ connections: Connection[] }>("/admin/imports/connections")
        .then((r) => setApps(r.connections.filter((c) => !c.revoked)))
        .catch(() => undefined),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // while a code is shown, the app using it is looked for every 3 seconds: once it has connected, the code (now used up) gives way to the app's name
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!code) return;
    known.current = new Set(apps.map((a) => a.id));
    const timer = window.setInterval(async () => {
      const r = await api<{ connections: Connection[] }>("/admin/imports/connections").catch(() => null);
      if (!r) return;
      const live = r.connections.filter((c) => !c.revoked);
      setApps(live);
      const fresh = live.find((c) => !known.current?.has(c.id));
      if (fresh) {
        setCode(null);
        ctx.flash(`Connected: ${fresh.label}. It now does the shop's Gleamshelf work.`);
      }
      if (Date.parse(code.expiresAt) < Date.now()) setCode(null);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  const show = async () => {
    try {
      setCode(await api<{ code: string; expiresAt: string; server: string }>("/admin/imports/pairing", { method: "POST" }));
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  };
  const disconnect = async (id: string) => {
    if (!window.confirm("Disconnect this app? It will stop doing any work for the shop.")) return;
    try {
      await api(`/admin/imports/connections/${id}`, { method: "DELETE" });
      void refresh();
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  };
  return (
    <section className="ad-card ad-imports__connect">
      <div>
        <div className="ad-label">Connect a Gleamshelf app</div>
        <p className="ad-muted ad-sm">
          In the Gleamshelf app, choose <b>Connect to a shop</b> and enter the address and the code shown below. The code works once, for 10
          minutes.
        </p>
        <button type="button" className="sh-btn ad-btn-sm" onClick={show}>
          Show a new code
        </button>
        {code && (
          <div className="ad-imports__code" aria-live="polite">
            {code.code}
            <small>
              address {code.server} · expires {new Date(code.expiresAt).toLocaleTimeString()}
            </small>
          </div>
        )}
      </div>
      <div>
        <div className="ad-label">Connected apps</div>
        {apps.length === 0 && <div className="ad-muted ad-sm">None yet.</div>}
        {apps.map((a) => (
          <div key={a.id} className="ad-imports__app">
            <span>
              <b>{a.label}</b>{" "}
              <span className="ad-muted ad-sm">{a.lastUsedAt ? `last used ${new Date(a.lastUsedAt).toLocaleString()}` : "never used"}</span>
            </span>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => disconnect(a.id)}>
              Disconnect
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
