import { useState } from "react";
import { PanelLayout, useTheme } from "@/components";
import { Wishlist } from "./Wishlist";
import { useAuth } from "../hooks";
import { initials } from "../format";

// let selectedTab: string = "orders";

export default function Account() {
  const [selectedTab, setSelectedTab] = useState("orders");
  const { theme, toggle } = useTheme();
  const auth = useAuth();

  return (
    <PanelLayout
      tag="ACCOUNT"
      tabs={[
        { key: "orders", label: "Orders" },
        { key: "wishlist", label: "Wishlist" },
        { key: "addresses", label: "Addresses" },
        { key: "profile", label: "Profile" },
      ]}
      active={selectedTab}
      onSelect={setSelectedTab}
      title={selectedTab.toUpperCase()}
      topActions={
        <>
          <button type="button" className="ui-theme" onClick={toggle} aria-label="Toggle dark mode">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div className="ui-user" title={auth.email ?? "Demo"}>
            <span className="ui-avatar">{initials(auth.email)}</span>
          </div>
        </>
      }
    >
      {import.meta.env.DEV && selectedTab === "wishlist" && <Wishlist />}
    </PanelLayout>
  );
}
