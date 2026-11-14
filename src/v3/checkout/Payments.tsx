import { useEffect, useRef, useState } from "react";
import { isOn } from "../../features";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

export interface CheckoutConfig {
  /** `test`: a local copy of the shop with no payment keys (a test payment, no money). */
  provider: "paypal" | "square" | "test";
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

export function PayPalPay({
  clientId,
  disabled,
  createOrder,
  onApprove,
  onError,
}: {
  clientId: string;
  disabled: boolean;
  createOrder: () => Promise<string>;
  onApprove: (paypalOrderId: string) => Promise<void>;
  onError: (message: string) => void;
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
type TokenResult = { status: string; token?: string; errors?: { message: string }[] };
type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy: () => Promise<void>;
};
/** Apple Pay, Google Pay or Afterpay: the shopper confirms in their own sheet or popup, so no card form and no 3-D Secure step. */
type SquareWallet = {
  attach?: (selector: string, options?: Record<string, string>) => Promise<void>;
  /** Afterpay only: "or 4 interest-free payments of $X" under the button. */
  attachMessage?: (selector: string, options?: Record<string, string>) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy?: () => Promise<void>;
};
type PaymentRequest = { update: (changes: { total: { amount: string; label: string } }) => unknown };
type SquarePayments = {
  card: () => Promise<SquareCard>;
  verifyBuyer: (token: string, details: unknown) => Promise<{ token: string }>;
  paymentRequest: (options: unknown) => PaymentRequest;
  applePay: (request: PaymentRequest) => Promise<SquareWallet>;
  googlePay: (request: PaymentRequest) => Promise<SquareWallet>;
  afterpayClearpay: (request: PaymentRequest) => Promise<SquareWallet>;
};
const squareSdk = () => (window as unknown as { Square?: { payments: (appId: string, locationId: string) => SquarePayments } }).Square;

/** The total the wallet sheet shows; kept in step with the quote. */
const walletTotal = (cents: number) => ({ amount: (Math.max(cents, 0) / 100).toFixed(2), label: "Spin Hobby" });

/** The shopper closed the Apple Pay, Google Pay or Afterpay sheet: not an error worth showing. */
// eslint-disable-next-line react-refresh/only-export-components -- an error type the checkout catches; it lives beside the buttons that throw it
export class WalletCancelled extends Error {
  constructor() {
    super("Payment cancelled.");
  }
}

async function walletToken(wallet: SquareWallet) {
  const result = await wallet.tokenize();
  if (result.status === "Cancel" || result.status === "Abort") throw new WalletCancelled();
  if (result.status !== "OK" || !result.token) throw new Error(result.errors?.[0]?.message ?? "The wallet couldn't complete the payment.");
  return { sourceId: result.token };
}
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment form."));
    document.head.appendChild(s);
  });
}

export function SquarePay({
  config,
  disabled,
  amountLabel,
  amountCents,
  onMethods,
  billing,
  pay,
  onError,
}: {
  config: CheckoutConfig;
  disabled: boolean;
  amountLabel: string;
  /** The order total in cents (null until the quote is in), shown on the Apple Pay / Google Pay sheet. */
  amountCents: number | null;
  /** Told which of Apple Pay, Google Pay and Afterpay this shopper can use, for the "accepted" list. */
  onMethods?: (names: string[]) => void;
  billing: {
    givenName: string;
    familyName: string;
    email: string;
    countryCode: string;
    city: string;
    postalCode: string;
    addressLines: string[];
  };
  pay: (tokenize: (amountCents: number) => Promise<{ sourceId: string; verificationToken?: string }>) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const requestRef = useRef<PaymentRequest | null>(null);
  const [wallets, setWallets] = useState<{ apple?: SquareWallet; google?: SquareWallet; afterpay?: SquareWallet }>({});
  const amountRef = useRef(amountCents);
  amountRef.current = amountCents;

  useEffect(() => {
    let cancelled = false;
    const made: SquareWallet[] = [];
    const src =
      config.squareEnv === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
    (async () => {
      try {
        if (!config.squareApplicationId || !config.squareLocationId) throw new Error("Card payments aren't configured yet.");
        await loadScript(src);
        const sdk = squareSdk();
        if (!sdk) throw new Error("Couldn't load the payment form.");
        const payments = sdk.payments(config.squareApplicationId, config.squareLocationId);
        const card = await payments.card();
        if (cancelled) {
          card.destroy();
          return;
        }
        await card.attach("#sq-card");
        paymentsRef.current = payments;
        cardRef.current = card;
        setReady(true);
        // Wallets show only where they work: Apple Pay in Safari on an Apple device (once the domain is registered with Square),
        // Google Pay in Chrome and on Android. Either may refuse; the card form stays.
        const request = payments.paymentRequest({
          countryCode: "CA",
          currencyCode: "CAD",
          total: walletTotal(amountRef.current ?? 0),
        });
        requestRef.current = request;
        // Afterpay (pay in 4): only with its feature switch on (src/features.ts, off for now), where Square has it turned on for the
        // shop, and only for totals Afterpay accepts
        const [apple, google, afterpay] = await Promise.all([
          payments.applePay(request).catch(() => undefined),
          payments.googlePay(request).catch(() => undefined),
          isOn("afterpay") ? payments.afterpayClearpay(request).catch(() => undefined) : undefined,
        ]);
        for (const w of [apple, google, afterpay]) if (w) made.push(w);
        if (cancelled) return;
        if (google) {
          setWallets((w) => ({ ...w, google }));
          // the container is in the page from the first render, so Square can draw its button into it
          await google.attach?.("#sq-gpay", { buttonColor: "black", buttonType: "long", buttonSizeMode: "fill" }).catch(() => {
            setWallets((w) => ({ ...w, google: undefined }));
          });
        }
        if (apple) setWallets((w) => ({ ...w, apple }));
        if (afterpay) {
          setWallets((w) => ({ ...w, afterpay }));
          try {
            await afterpay.attach?.("#sq-afterpay");
            await afterpay.attachMessage?.("#sq-afterpay-note");
          } catch {
            setWallets((w) => ({ ...w, afterpay: undefined }));
          }
        }
      } catch (e) {
        onError(e instanceof Error ? e.message : "Couldn't load the payment form.");
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy();
      cardRef.current = null;
      for (const w of made) void w.destroy?.();
      setWallets({});
    };
  }, [config.squareApplicationId, config.squareLocationId, config.squareEnv, onError]);

  useEffect(() => {
    if (amountCents != null) requestRef.current?.update({ total: walletTotal(amountCents) });
  }, [amountCents]);

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
            amount: (amountCents / 100).toFixed(2),
            currencyCode: "CAD",
            intent: "CHARGE",
            billingContact: billing,
          });
          verificationToken = verified?.token;
        } catch {
          /* 3-D Secure not required for this card */
        }
        return { sourceId: result.token, verificationToken };
      });
    } finally {
      setBusy(false);
    }
  };

  /** Apple Pay must open its sheet in the click itself, so nothing is awaited before `tokenize` runs. */
  const payWithWallet = (wallet: SquareWallet) => {
    if (disabled || busy) return;
    setBusy(true);
    void pay(async (cents) => {
      requestRef.current?.update({ total: walletTotal(cents) });
      return walletToken(wallet);
    }).finally(() => setBusy(false));
  };

  const hasWallet = Boolean(wallets.apple || wallets.google || wallets.afterpay);
  const methods = [wallets.apple && "Apple Pay", wallets.google && "Google Pay", wallets.afterpay && "Afterpay"].filter(Boolean).join(",");
  useEffect(() => onMethods?.(methods ? methods.split(",") : []), [methods, onMethods]);

  return (
    <div className="co-square">
      <div className="co-wallets" data-disabled={disabled || busy ? "" : undefined} hidden={!hasWallet}>
        {wallets.apple && (
          <button
            type="button"
            className="co-wallet co-wallet--apple"
            aria-label={`Pay ${amountLabel} with Apple Pay`}
            disabled={disabled || busy}
            onClick={() => payWithWallet(wallets.apple!)}
          />
        )}
        {/* Square draws the Google Pay button in here */}
        <div
          id="sq-gpay"
          className="co-wallet co-wallet--google"
          hidden={!wallets.google}
          onClick={() => wallets.google && payWithWallet(wallets.google)}
        />
        {/* and the Afterpay button, with its "4 payments of" line */}
        <div
          id="sq-afterpay"
          className="co-wallet co-wallet--afterpay"
          hidden={!wallets.afterpay}
          onClick={() => wallets.afterpay && payWithWallet(wallets.afterpay)}
        />
        <div id="sq-afterpay-note" className="co-afterpay-note" hidden={!wallets.afterpay} />
      </div>
      {hasWallet && (
        <p className="co-or">
          <span>or pay by card</span>
        </p>
      )}
      <div id="sq-card" className="co-square__card" />
      {!ready && <div className="sh-skeleton" style={{ height: 48 }} />}
      <button type="button" className="sh-btn co-pay-btn" disabled={disabled || !ready || busy} onClick={submit}>
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </div>
  );
}
