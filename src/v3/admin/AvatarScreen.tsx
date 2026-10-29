import { Suspense, useState } from "react";
import { AvatarMode } from "@gleamshelf/react";
import "@gleamshelf/react/style.css";
import { Button, Card } from "../../components";

/**
 * Admin > Avatar: the shop's live avatar, Gleamshelf's Avatar mode, full screen. It talks to the Gleamshelf app on this computer (the
 * same pairing as the photo editor) for the voice, the AI assistant and product videos; the avatar itself, its moves and the camera
 * tracking work without it. Nothing here is sent to the shop's server except what the owner turns on (the website's assistant).
 */
export default function AvatarScreen() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card title="Live avatar" padded>
        <p>
          The shop's own vtuber: an anime avatar that follows your face and hands, talks in its own voice (or yours, clearer), goes into OBS
          and video calls, answers viewers and website visitors as an AI assistant, and presents products in short videos.
        </p>
        <p className="ad-muted">
          Free and on this computer: the voice and the AI need the Gleamshelf app running here, the same as the photo editor.
        </p>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Open the avatar
        </Button>
      </Card>
      {open && (
        <div className="ad-live-avatar" role="dialog" aria-label="Live avatar">
          <Suspense fallback={<p className="ad-muted">Loading the avatar…</p>}>
            <AvatarMode title="Live avatar" onClose={() => setOpen(false)} />
          </Suspense>
        </div>
      )}
    </>
  );
}
