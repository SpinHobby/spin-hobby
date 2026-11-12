import { useState } from "react";
import { Card, PanelLayout, Spinner, useTheme } from "@/components";
import { Profile } from "./Profile";
import { Wishlist } from "./Wishlist";
import { useAuth } from "../hooks";
import { SignInPanel } from "../SignIn";
import { initials } from "../format";

type Tab = "orders" | "wishlist" | "addresses" | "profile";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "wishlist", label: "Wishlist" },
  { key: "addresses", label: "Addresses" },
  { key: "profile", label: "Profile" },
];

export default function Account() {
  const [selectedTab, setSelectedTab] = useState("orders");
  const { theme, toggle } = useTheme();
  const auth = useAuth();
  const { user, ready, signOut } = auth;

  return (
    <PanelLayout
      tag="ACCOUNT"
      tabs={TABS}
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
      {/* A saved session shows the page straight away; with none, wait for the sign-in check before offering to sign in. */}
      {!user ? (
        ready ? (
          <Card title="Sign in to see your account" padded>
            <SignInPanel returnPath="/account" allowSignup />
          </Card>
        ) : (
          <Spinner />
        )
      ) : (
        <>
          {import.meta.env.DEV && selectedTab === "wishlist" && <Wishlist />}
          {selectedTab === "profile" && <Profile user={user} onSignOut={() => void signOut()} />}
        </>
      )}
    </PanelLayout>
  );
}
