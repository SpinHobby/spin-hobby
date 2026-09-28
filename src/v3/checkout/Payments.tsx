import { useEffect, useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

export interface CheckoutConfig {
  provider: "paypal" | "square";
  paypalClientId: string | null;
  paypalEnv: "live" | "sandbox";
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnv: "production" | "sandbox";
  shippingStandardCents: number;
  shippingExpressCents: number;
  freeShippingThresholdCents: number;
  handlingDaysMin?: number;
  handlingDaysMax?: number;
}

export function PayPalPay({ clientId, disabled, createOrder, onApprove, onError }: {
  clientId: string; disabled: boolean;
  createOrder: () => Promise<string>; onApprove: (paypalOrderId: string) => Promise<void>; onError: (message: string) => void;
}) {
  return (
    <PayPalScriptProvider options={{ clientId, currency: "CAD", intent: "capture", components: "buttons" }}>
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "pay", height: 46 }}
        disabled={disabled}
        forceReRender={[disabled]}
        createOrder={() => createOrder()}
        onApprove={(data) => onApprove(data.orderID)}
        onError={(err) => onError(err instanceof Error ? err.message : "PayPal couldn't complete the payment.")}
      />
    </PayPalScriptProvider>
  );
}

// Minimal typings for the Square Web Payments SDK.
type SquareCard = { attach: (selector: string) => Promise<void>; tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>; destroy: () => Promise<void> };
type SquarePayments = { card: () => Promise<SquareCard>; verifyBuyer: (token: string, details: unknown) => Promise<{ token: string }> };
const squareSdk = () => (window as unknown as { Square?: { payments: (appId: string, locationId: string) => SquarePayments } }).Square;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error("Couldn't load the payment form."));
    document.head.appendChild(s);
  });
}

export function SquarePay({ config, disabled, amountLabel, billing, pay, onError }: {
  config: CheckoutConfig; disabled: boolean; amountLabel: string;
  billing: { givenName: string; familyName: string; email: string; countryCode: string; city: string; postalCode: string; addressLines: string[] };
  pay: (tokenize: (amountCents: number) => Promise<{ sourceId: string; verificationToken?: string }>) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);

  useEffect(() => {
    let cancelled = false;
    const src = config.squareEnv === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
    (async () => {
      try {
        if (!config.squareApplicationId || !config.squareLocationId) throw new Error("Card payments aren't configured yet.");
        await loadScript(src);
        const sdk = squareSdk();
        if (!sdk) throw new Error("Couldn't load the payment form.");
        const payments = sdk.payments(config.squareApplicationId, config.squareLocationId);
        const card = await payments.card();
        if (cancelled) { card.destroy(); return; }
        await card.attach("#sq-card");
        paymentsRef.current = payments; cardRef.current = card; setReady(true);
      } catch (e) { onError(e instanceof Error ? e.message : "Couldn't load the payment form."); }
    })();
    return () => { cancelled = true; cardRef.current?.destroy(); cardRef.current = null; };
  }, [config.squareApplicationId, config.squareLocationId, config.squareEnv, onError]);

  const submit = async () => {
    if (!cardRef.current || !paymentsRef.current) return;
    setBusy(true);
    try {
      await pay(async (amountCents) => {
        const result = await cardRef.current!.tokenize();
        if (result.status !== "OK" || !result.token) throw new Error(result.errors?.[0]?.message ?? "Check your card details.");
        let verificationToken: string | undefined;
        try {
          const verified = await paymentsRef.current!.verifyBuyer(result.token, {
            amount: (amountCents / 100).toFixed(2), currencyCode: "CAD", intent: "CHARGE", billingContact: billing,
          });
          verificationToken = verified?.token;
        } catch { /* 3-D Secure not required for this card */ }
        return { sourceId: result.token, verificationToken };
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="co-square">
      <div id="sq-card" className="co-square__card" />
      {!ready && <div className="sh-skeleton" style={{ height: 48 }} />}
      <button type="button" className="sh-btn co-pay-btn" disabled={disabled || !ready || busy} onClick={submit}>
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </div>
  );
}
