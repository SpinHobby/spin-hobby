import { useState } from "react";
import { PanelLayout } from "@/components";
import { Wishlist } from "./Wishlist";

// let selectedTab: string = "orders";

export default function Account() {
  const [selectedTab, setSelectedTab] = useState("orders");

  return (
    <PanelLayout
      tag="ACCOUNT"
      tabs={[
        { key: "orders", label: "Orders" },
        { key: "Wishlist", label: "Wishlist" },
        { key: "addresses", label: "Addresses" },
        { key: "profile", label: "Profile" },
      ]}
      active={selectedTab}
      onSelect={setSelectedTab}
      title={selectedTab.toUpperCase()}
    >
      {selectedTab === "wishlist" && <Wishlist />}
    </PanelLayout>
  );
}
