import React, { useEffect, useState } from "react";
import { getLinkedProviders } from "../../../api/customerAuth";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  discord: "Discord",
  apple: "Apple",
};

export function LinkedAccounts() {
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLinkedProviders()
      .then(setProviders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div id="account-linked">
      <p className="account-summary-line">
        There are no passwords on this account — you sign in with the providers below.
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="account-provider-list">
          {providers.map((provider) => (
            <div className="account-provider-row" key={provider}>
              <span>{PROVIDER_LABELS[provider] || provider}</span>
              <span className="account-provider-connected">Connected</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
