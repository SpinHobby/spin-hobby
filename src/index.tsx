import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { IS_STAGING, markStaging } from "./staging";
import { StagingBadge } from "./StagingBadge";
import { ServerStatus } from "./ServerStatus";
import { API_URL } from "./lib/api";
import { wakeServer } from "./lib/serverStatus";
import { startAnalytics } from "./lib/analytics";
import { queryClient } from "./lib/query";

if (IS_STAGING) markStaging();
// start a sleeping server waking as soon as the site opens, so the banner shows before the first click
wakeServer(API_URL);
// anonymous step counts and browser error reports (src/lib/analytics.ts)
startAnalytics();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  // server data the pages read is shared and remembered through this (src/lib/query.ts)
  <QueryClientProvider client={queryClient}>
    <App />
    <ServerStatus />
    {IS_STAGING && <StagingBadge />}
  </QueryClientProvider>,
);
