import { Component, type ReactNode } from "react";

/**
 * Keeps a photo editor that fails to load (a tab left open across a deploy asks for an old file, a dropped connection) from blanking the
 * whole admin: it says so, and closing gets the person back to where they were.
 */
export class EditorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        className="sh-overlay"
        role="alertdialog"
        aria-label="The photo editor could not open"
        style={{ display: "grid", placeItems: "center", zIndex: 10000 }}
      >
        <div className="ad-card ad-pad" style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 10 }}>
          <b>The photo editor could not open.</b>
          <span className="ad-muted ad-sm">Reload the page and try again (the admin may have just been updated).</span>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sh-btn ad-btn-sm" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="sh-btn sh-btn--ghost ad-btn-sm"
              onClick={() => {
                this.setState({ failed: false });
                this.props.onClose();
              }}
            >
              Close
            </button>
          </span>
        </div>
      </div>
    );
  }
}
