import { useState } from "react";
import { Card, PanelLayout, Spinner } from "@/components";
import { useAuth } from "../hooks";
import { SignInPanel } from "../SignIn";
import { Profile } from "./Profile";
import { Wishlist } from "./Wishlist";

// let selectedTab: string = "orders";

export default function Account() {
  const [selectedTab, setSelectedTab] = useState("orders");
  const { user, ready, signOut } = useAuth();

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
          {selectedTab === "wishlist" && <Wishlist />}
          {selectedTab === "profile" && <Profile user={user} onSignOut={() => void signOut()} />}
        </>
      )}
    </PanelLayout>
  );
}
