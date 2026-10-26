import { useState } from "react";

/**
 * The storefront's "Shop playlist": a button at the end of the section tabs that opens a small YouTube player docked in the corner.
 * The player opens paused: music only starts when the shopper presses YouTube's play button (music starting by itself annoys
 * people). It stays visible while it plays (YouTube's embed rules: no hidden or shrunken players), and closing it stops the music.
 * The owner picks the playlist in Admin > Settings; without one, nothing shows. Uses YouTube's privacy-enhanced address, so no
 * YouTube cookies are set until the shopper plays something.
 */
export function ShopPlaylist({ playlistId }: { playlistId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`sf-music-btn ${open ? "is-on" : ""}`}
        aria-pressed={open}
        aria-controls="sf-music"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>🎧</span> {open ? "Close player" : "Shop playlist"}
      </button>
      {open && (
        <aside id="sf-music" className="sf-music" aria-label="Shop playlist">
          <div className="sf-music__head">
            <b>Shop playlist</b>
            <button type="button" className="sh-icon-btn" onClick={() => setOpen(false)} aria-label="Close the player (stops the music)">
              ×
            </button>
          </div>
          <iframe
            className="sf-music__player"
            src={`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0`}
            title="Shop playlist (YouTube)"
            allow="encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <span className="sf-music__note">
            Press <b>▶</b> on the video to start. Closing the player stops the music.
          </span>
        </aside>
      )}
    </>
  );
}
