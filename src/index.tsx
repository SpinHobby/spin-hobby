import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { IS_STAGING, markStaging } from "./staging";
import { StagingBadge } from "./StagingBadge";
import { ServerStatus } from "./ServerStatus";
import { API_URL } from "./lib/api";
import { wakeServer } from "./lib/serverStatus";

if (IS_STAGING) markStaging();
// start a sleeping server waking as soon as the site opens, so the banner shows before the first click
wakeServer(API_URL);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <>
    <App />
    <ServerStatus />
    {IS_STAGING && <StagingBadge />}
  </>
);
