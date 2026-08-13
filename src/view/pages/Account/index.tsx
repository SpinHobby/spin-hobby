import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "./Menu";
import { Summary } from "./Summary";
import { History } from "./History";
import { Address } from "./Address";
import { LinkedAccounts } from "./LinkedAccounts";
import { LogOut } from "./LogOut";
import { Content } from "./types";
import { menuItems } from "./constants";
import { useUserSelector } from "../../../selectors";

const TAB_PARAM_TO_CONTENT: Record<string, Content> = {
  history: Content.OrderHistory,
  address: Content.Address,
  linked: Content.LinkedAccounts,
};

export function Account() {
  const [searchParams] = useSearchParams();
  const initialTab = TAB_PARAM_TO_CONTENT[searchParams.get("tab") || ""] ?? Content.Summary;
  const [content, setContent] = useState<Content>(initialTab);
  const { user } = useUserSelector();

  function getDetails() {
    switch (content) {
      case Content.Summary:
        return <Summary />;
      case Content.OrderHistory:
        return <History />;
      case Content.Address:
        return <Address />;
      case Content.LinkedAccounts:
        return <LinkedAccounts />;
      case Content.LogOut:
        return <LogOut />;
      default:
        return null;
    }
  }

  const welcomeName = user?.fname || user?.email || "there";

  return (
    <div id="account">
      <div id="account-container">
        <div id="account-header">{`My Account → ${
          menuItems.find((item) => item.content === content)?.label
        }`}</div>
        <div id="account-content">
          <Menu content={content} onChange={(content) => setContent(content)} />
          <div id="account-content-right">
            <div className="account-side-title">Welcome, {welcomeName}</div>
            <div id="account-details">{getDetails()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
