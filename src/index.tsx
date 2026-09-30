// import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import store from "./store";
import "./api/httpMonitor";
import { IS_STAGING, markStaging } from "./staging";
import { StagingBadge } from "./StagingBadge";

if (IS_STAGING) markStaging();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <Provider store={store}>
    <App />
    {IS_STAGING && <StagingBadge />}
  </Provider>
);
