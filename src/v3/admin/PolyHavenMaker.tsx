import { useEffect, useMemo, useRef, useState } from "react";
import { compose, listRooms, listTables, listWalls, loadAsset, paint, toFile, type HavenAsset, type Px, type Recipe } from "./polyHaven";

type Mode = "room" | "scene" | "studio";
type Pick = "room" | "wall" | "table";

const PAGE = 24;
const PREVIEW = 480;
const DEFAULT_TABLE = "white_oak_veneer";
const DEFAULT_WALL = "painted_plaster_wall";
const DEFAULT_ROOM = "comfy_cafe";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** One Poly Haven picture: its list entry and, once downloaded, its pixels. */
function useAsset(kind: "room" | "texture", id: string | null) {
  const [state, setState] = useState<{ id: string; px: Px } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let live = true;
    setError("");
    loadAsset(id, kind).then(
      (px) => live && setState({ id, px }),
      (e) => live && setError(errMsg(e)),
    );
    return () => {
      live = false;
    };
  }, [id, kind]);
  return { px: state && state.id === id ? state.px : null, loading: !!id && state?.id !== id && !error, error };
}

/**
 * "Make one from Poly Haven": the shop's own backgrounds made from Poly Haven's free photo library, listed live (nothing for us to keep up to
 * date). Choose a room, or a wall and a table, or a studio colour; turn and brighten it in the preview; add it to the library at full size.
 */
export function PolyHavenMaker({ busy, add }: { busy: boolean; add: (name: string, make: () => Promise<File>) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("room");
  const [pick, setPick] = useState<Pick>("room");
  const [lists, setLists] = useState<Record<Pick, HavenAsset[] | null>>({ room: null, wall: null, table: null });
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [roomId, setRoomId] = useState(DEFAULT_ROOM);
  const [wallId, setWallId] = useState(DEFAULT_WALL);
  const [tableId, setTableId] = useState(DEFAULT_TABLE);
  const [withTable, setWithTable] = useState(true);
  const [yaw, setYaw] = useState(30);
  const [pitch, setPitch] = useState(16);
  const [softness, setSoftness] = useState({ room: 14, scene: 22 });
  const [turnTable, setTurnTable] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [colour, setColour] = useState("#e8e0d2");
  const preview = useRef<HTMLCanvasElement>(null);

  const room = useAsset("room", mode === "room" ? roomId : null);
  const wall = useAsset("texture", mode === "scene" ? wallId : null);
  const table = useAsset("texture", mode === "studio" || (mode === "room" && !withTable) ? null : tableId);

  // the list for what is being chosen, loaded once
  const listing = mode === "studio" ? null : pick;
  useEffect(() => {
    if (!listing || lists[listing]) return;
    const load = listing === "room" ? listRooms : listing === "wall" ? listWalls : listTables;
    load().then(
      (l) => setLists((prev) => ({ ...prev, [listing]: l })),
      (e) => setListError(errMsg(e)),
    );
  }, [listing, lists]);

  const recipe = useMemo<Recipe | null>(() => {
    if (mode === "studio") return { kind: "studio", colour: hexToRgb(colour) };
    if (mode === "room")
      return room.px && (!withTable || table.px)
        ? { kind: "room", room: room.px, table: withTable ? table.px : null, yaw, pitch, blur: softness.room, turnTable, brightness }
        : null;
    return wall.px && table.px ? { kind: "scene", wall: wall.px, table: table.px, blur: softness.scene, turnTable, brightness } : null;
  }, [mode, colour, room.px, wall.px, table.px, withTable, yaw, pitch, softness, turnTable, brightness]);

  // redraw the small preview shortly after the last change
  useEffect(() => {
    if (!recipe || !preview.current) return;
    const t = window.setTimeout(() => preview.current && paint(compose(recipe, PREVIEW), preview.current), 120);
    return () => window.clearTimeout(t);
  }, [recipe]);

  const list = listing ? lists[listing] : null;
  const chosen = listing === "room" ? roomId : listing === "wall" ? wallId : tableId;
  const found = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list ?? []).filter((a) => !q || a.name.toLowerCase().includes(q) || a.categories.some((c) => c.includes(q)));
  }, [list, search]);
  const nameOf = (p: Pick, id: string) => lists[p]?.find((a) => a.id === id)?.name ?? id.replace(/_/g, " ");

  const choose = (id: string) => {
    if (listing === "room") setRoomId(id);
    else if (listing === "wall") setWallId(id);
    else setTableId(id);
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setPick(m === "scene" ? "wall" : "room");
    setSearch("");
    setShown(PAGE);
  };
  const switchPick = (p: Pick) => {
    setPick(p);
    setSearch("");
    setShown(PAGE);
  };

  const name =
    mode === "studio"
      ? `Studio ${colour.toUpperCase()}`
      : mode === "room"
        ? `${nameOf("room", roomId)}${withTable ? ` with ${nameOf("table", tableId).toLowerCase()}` : ""}`
        : `${nameOf("wall", wallId)} and ${nameOf("table", tableId).toLowerCase()}`;
  const loading = room.loading || wall.loading || table.loading;
  const error = room.error || wall.error || table.error;

  const addIt = () => {
    if (!recipe) return;
    void add(name, async () => {
      await new Promise((r) => setTimeout(r, 30)); // let "Making…" show before the full-size work
      return toFile(compose(recipe, 2000), name);
    });
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, show?: string) => (
    <label className="ad-phaven__slider">
      <span>
        {label} <span className="ad-muted">{show ?? value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );

  return (
    <div className="ad-phaven">
      <div className="ad-phaven__modes" role="tablist" aria-label="Kind of background">
        {(
          [
            ["room", "A room"],
            ["scene", "A wall and a table"],
            ["studio", "A studio colour"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "is-on" : ""}
            onClick={() => switchMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ad-phaven__body">
        <div className="ad-phaven__make">
          <div className="ad-phaven__preview">
            <canvas ref={preview} width={PREVIEW} height={PREVIEW} aria-label={`Preview: ${name}`} />
            {(loading || (!recipe && !error)) && <span className="ad-phaven__note">Downloading from Poly Haven…</span>}
            {error && <span className="ad-phaven__note">{error}</span>}
          </div>
          <b className="ad-sm">{name}</b>
          {mode === "room" && (
            <>
              {slider("Turn", yaw, -180, 180, 2, setYaw, `${yaw}°`)}
              {slider("Look down", pitch, 0, 30, 1, setPitch, `${pitch}°`)}
              {slider("Background blur", softness.room, 0, 30, 1, (v) => setSoftness((s) => ({ ...s, room: v })))}
              <label className="ad-phaven__check">
                <input type="checkbox" checked={withTable} onChange={(e) => setWithTable(e.target.checked)} /> A table in front
              </label>
            </>
          )}
          {mode === "scene" && slider("Wall blur", softness.scene, 0, 40, 1, (v) => setSoftness((s) => ({ ...s, scene: v })))}
          {mode !== "studio" && (
            <>
              {slider("Brightness", brightness, 0.7, 1.3, 0.02, setBrightness, `${Math.round(brightness * 100)}%`)}
              {(mode === "scene" || withTable) && (
                <label className="ad-phaven__check">
                  <input type="checkbox" checked={turnTable} onChange={(e) => setTurnTable(e.target.checked)} /> Turn the table's grain
                </label>
              )}
            </>
          )}
          {mode === "studio" && (
            <label className="ad-phaven__check">
              Colour <input type="color" value={colour} onChange={(e) => setColour(e.target.value)} />
            </label>
          )}
          <button type="button" className="sh-btn ad-btn-sm" onClick={addIt} disabled={busy || !recipe}>
            + Add to library
          </button>
        </div>
        {mode !== "studio" && (
          <div className="ad-phaven__pick">
            <div className="ad-phaven__modes" role="tablist" aria-label="What to choose">
              {(mode === "room" ? (withTable ? (["room", "table"] as const) : (["room"] as const)) : (["wall", "table"] as const)).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={pick === p}
                    className={pick === p ? "is-on" : ""}
                    onClick={() => switchPick(p)}
                  >
                    {p === "room" ? "Room" : p === "wall" ? "Wall" : "Table"}:{" "}
                    {nameOf(p, p === "room" ? roomId : p === "wall" ? wallId : tableId)}
                  </button>
                ),
              )}
            </div>
            <input
              type="search"
              className="sh-input"
              placeholder={`Search ${pick === "room" ? "rooms (café, studio, christmas…)" : pick === "wall" ? "walls (plaster, brick…)" : "tables (oak, walnut, linen…)"}`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShown(PAGE);
              }}
            />
            {listError && <span className="ad-muted ad-sm">{listError}</span>}
            {!list && !listError && <span className="ad-muted ad-sm">Loading Poly Haven's library…</span>}
            {list && (
              <>
                <div className="ad-phaven__grid">
                  {found.slice(0, shown).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`ad-phaven__item ${a.id === chosen ? "is-on" : ""}`}
                      onClick={() => choose(a.id)}
                      title={a.name}
                      aria-pressed={a.id === chosen}
                    >
                      <img src={a.thumb} alt="" loading="lazy" />
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
                <span className="ad-muted ad-sm">
                  {found.length === 0 ? "Nothing matches. Try another word." : `${Math.min(shown, found.length)} of ${found.length}`}
                  {shown < found.length && (
                    <>
                      {" "}
                      <button type="button" className="ad-link" onClick={() => setShown((s) => s + PAGE)}>
                        Show more
                      </button>
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <span className="ad-muted ad-sm">
        Photos and textures from Poly Haven's free library (CC0: free for the shop to use, no credit needed on the website), listed live, so
        new ones appear here by themselves.{" "}
        <a href="https://polyhaven.com" target="_blank" rel="noreferrer">
          Powered by Poly Haven
        </a>
      </span>
    </div>
  );
}
