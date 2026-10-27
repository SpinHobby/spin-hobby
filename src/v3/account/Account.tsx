import { useCallback, useState } from "react";
import { PanelLayout } from "@/components";
import { Wishlist } from "./Wishlist";

type Tab = "orders" | "wishlist" | "addresses" | "profile";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "wishlist", label: "Wishlist" },
  { key: "addresses", label: "Addresses" },
  { key: "profile", label: "Profile" },
];

export default function Account() {
  const [selectedTab, setSelectedTab] = useState<Tab>(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return TABS.some((t) => t.key === hash) ? (hash as Tab) : "orders";
  });

  const select = useCallback((next: Tab) => {
    setSelectedTab(next);
    // PanelLayout scrolls to the top and eases the new screen in
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  return (
    <PanelLayout
      tag="ACCOUNT"
      tabs={TABS}
      active={selectedTab}
      onSelect={select}
      title={TABS.find((t) => t.key === selectedTab)!.label}
    >
      {selectedTab === "wishlist" && <Wishlist />}
    </PanelLayout>
  );
}
