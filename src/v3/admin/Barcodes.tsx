import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dateLabel } from "../format";
import { photo } from "../photo";
import { Banner, Button, Card, DataTable, EmptyState, type Column } from "../../components";
import type { Ctx } from "./Screens";

/** A barcode the photo computer found, as GET /admin/barcodes returns it. */
interface Finding {
  productId: string;
  name: string;
  image: string | null;
  code: string;
  source: "photo" | "page" | "both";
  foundAt: string;
}
interface Counts {
  missing: number;
  scanned: number;
  none: number;
  applied: number;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const SOURCE: Record<Finding["source"], string> = {
  both: "On the box and on the product's pages",
  photo: "Read off the box photo",
  page: "From the product's pages",
};

/**
 * Admin > Barcodes: barcodes (JAN / UPC) the connected Gleamshelf app found for products that have none. Google Shopping ranks a listing with
 * one far higher. Applying one makes it the product's JAN code (the website, search and the Google feed use it); nothing is written without that.
 */
export function BarcodesScreen({ ctx }: { ctx: Ctx }) {
  const [found, setFound] = useState<Finding[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<{ found: Finding[]; counts: Counts }>("/admin/barcodes")
      .then((r) => {
        setFound(r.found);
        setCounts(r.counts);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const act = async (f: Finding, what: "apply" | "dismiss") => {
    setBusy(f.productId);
    try {
      await api(`/admin/barcodes/${encodeURIComponent(f.productId)}/${what}`, { method: "POST" });
      setFound((list) => list?.filter((x) => x.productId !== f.productId) ?? null);
      ctx.flash(what === "apply" ? `${f.name}: barcode ${f.code} saved` : `${f.name}: skipped`);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(null);
    }
  };
  const agreed = found?.filter((f) => f.source === "both").length ?? 0;
  const applyAgreed = async () => {
    setBusy("all");
    try {
      const r = await api<{ applied: number; skipped: string[] }>("/admin/barcodes/apply-agreed", { method: "POST" });
      ctx.flash(
        `${r.applied} barcode${r.applied === 1 ? "" : "s"} saved${r.skipped.length ? `; ${r.skipped.length} skipped: ${r.skipped[0]}` : ""}`,
      );
      load();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<Finding>[] = [
    {
      key: "product",
      header: "Product",
      width: "minmax(170px, 3fr)",
      render: (f) => (
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`sh-thumb ${f.image ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 44, height: 44, flex: "none" }}>
            {f.image && <img {...photo(f.image, 88)} alt="" />}
          </span>
          <b>{f.name}</b>
        </span>
      ),
    },
    {
      key: "code",
      header: "Barcode",
      width: "minmax(170px, 2fr)",
      render: (f) => (
        <span className="ad-acct__who">
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{f.code}</b>
          <span className="ad-muted ad-sm">{SOURCE[f.source]}</span>
        </span>
      ),
    },
    { key: "found", header: "Found", width: "110px", render: (f) => <span className="ad-sm">{dateLabel(f.foundAt)}</span> },
    {
      key: "act",
      header: "",
      width: "160px",
      render: (f) => (
        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button size="sm" disabled={!!busy} onClick={() => act(f, "apply")}>
            Use it
          </Button>
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(f, "dismiss")}>
            Skip
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <p className="ad-muted" style={{ margin: 0 }}>
        Barcodes for products that have none, found by the connected Gleamshelf app: read off the box in the product's photos, or given by
        the product's own pages. Google Shopping ranks a listing with a barcode much higher. Check the number against the box, then use it
        or skip it.
      </p>
      {counts && (
        <p className="ad-sm" style={{ margin: 0 }}>
          {counts.missing} product{counts.missing === 1 ? "" : "s"} without a barcode · {counts.scanned} checked by Gleamshelf ·{" "}
          {counts.none} with none found · {counts.applied} added here
          {counts.missing > counts.scanned && " · Gleamshelf checks the rest when it has nothing else to do (keep the app running)."}
        </p>
      )}
      {error && (
        <Banner tone="error" action={{ label: "Try again", onClick: load }}>
          {error}
        </Banner>
      )}
      {agreed > 0 && (
        <div>
          <Button onClick={applyAgreed} disabled={!!busy}>
            {agreed === 1 ? "Use the one where the box and the pages agree" : `Use all ${agreed} where the box and the pages agree`}
          </Button>
        </div>
      )}
      <Card>
        <DataTable
          label="Barcodes found"
          columns={columns}
          rows={found ?? []}
          rowKey={(f) => f.productId}
          loading={!found && !error}
          minWidth={600}
          empty={<EmptyState>Nothing waiting. New finds show up here.</EmptyState>}
        />
      </Card>
    </>
  );
}
