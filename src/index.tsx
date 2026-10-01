import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { IS_STAGING, markStaging } from "./staging";
import { StagingBadge } from "./StagingBadge";

if (IS_STAGING) markStaging();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <>
    <App />
    {IS_STAGING && <StagingBadge />}
  </>
);
