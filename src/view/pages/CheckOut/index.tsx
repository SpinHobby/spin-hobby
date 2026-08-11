import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useCartSelector } from "../../../selectors";
import { clearCart } from "../../../reducers";
import calculateSubTotal from "utils/calculateSubTotal";
import { getSquareConfig, createPayment } from "../../../api/square";

declare global {
  interface Window {
    Square?: any;
  }
}

interface CountryCode {
  code: string;
  country: string;
}

const countryCodes: CountryCode[] = [
  { code: "AFG", country: "Afghanistan" },
  { code: "ALB", country: "Albania" },
  { code: "DZA", country: "Algeria" },
  { code: "ASM", country: "American Samoa" },
  { code: "AND", country: "Andorra" },
  { code: "AGO", country: "Angola" },
  { code: "AIA", country: "Anguilla" },
  { code: "ATA", country: "Antarctica" },
  { code: "ATG", country: "Antigua and Barbuda" },
  { code: "ARG", country: "Argentina" },
  { code: "ARM", country: "Armenia" },
  { code: "ABW", country: "Aruba" },
  { code: "AUS", country: "Australia" },
  { code: "AUT", country: "Austria" },
  { code: "AZE", country: "Azerbaijan" },
  { code: "BHS", country: "Bahamas (the)" },
  { code: "BHR", country: "Bahrain" },
  { code: "BGD", country: "Bangladesh" },
  { code: "BRB", country: "Barbados" },
  { code: "BLR", country: "Belarus" },
  { code: "BEL", country: "Belgium" },
  { code: "BLZ", country: "Belize" },
  { code: "BEN", country: "Benin" },
  { code: "BMU", country: "Bermuda" },
  { code: "BTN", country: "Bhutan" },
  { code: "BOL", country: "Bolivia (Plurinational State of)" },
  { code: "BES", country: "Bonaire, Sint Eustatius and Saba" },
  { code: "BIH", country: "Bosnia and Herzegovina" },
  { code: "BWA", country: "Botswana" },
  { code: "BVT", country: "Bouvet Island" },
  { code: "BRA", country: "Brazil" },
  { code: "IOT", country: "British Indian Ocean Territory (the)" },
  { code: "BRN", country: "Brunei Darussalam" },
  { code: "BGR", country: "Bulgaria" },
  { code: "BFA", country: "Burkina Faso" },
  { code: "BDI", country: "Burundi" },
  { code: "CPV", country: "Cabo Verde" },
  { code: "KHM", country: "Cambodia" },
  { code: "CMR", country: "Cameroon" },
  { code: "CAN", country: "Canada" },
  { code: "CYM", country: "Cayman Islands (the)" },
  { code: "CAF", country: "Central African Republic (the)" },
  { code: "TCD", country: "Chad" },
  { code: "CHL", country: "Chile" },
  { code: "CHN", country: "China" },
  { code: "CXR", country: "Christmas Island" },
  { code: "CCK", country: "Cocos (Keeling) Islands (the)" },
  { code: "COL", country: "Colombia" },
  { code: "COM", country: "Comoros (the)" },
  { code: "COD", country: "Congo (the Democratic Republic of the)" },
  { code: "COG", country: "Congo (the)" },
  { code: "COK", country: "Cook Islands (the)" },
  { code: "CRI", country: "Costa Rica" },
  { code: "HRV", country: "Croatia" },
  { code: "CUB", country: "Cuba" },
  { code: "CUW", country: "Curaçao" },
  { code: "CYP", country: "Cyprus" },
  { code: "CZE", country: "Czechia" },
  { code: "CIV", country: "Côte d'Ivoire" },
  { code: "DNK", country: "Denmark" },
  { code: "DJI", country: "Djibouti" },
  { code: "DMA", country: "Dominica" },
  { code: "DOM", country: "Dominican Republic (the)" },
  { code: "ECU", country: "Ecuador" },
  { code: "EGY", country: "Egypt" },
  { code: "SLV", country: "El Salvador" },
  { code: "GNQ", country: "Equatorial Guinea" },
  { code: "ERI", country: "Eritrea" },
  { code: "EST", country: "Estonia" },
  { code: "SWZ", country: "Eswatini" },
  { code: "ETH", country: "Ethiopia" },
  { code: "FLK", country: "Falkland Islands (the) [Malvinas]" },
  { code: "FRO", country: "Faroe Islands (the)" },
  { code: "FJI", country: "Fiji" },
  { code: "FIN", country: "Finland" },
  { code: "FRA", country: "France" },
  { code: "GUF", country: "French Guiana" },
  { code: "PYF", country: "French Polynesia" },
  { code: "ATF", country: "French Southern Territories (the)" },
  { code: "GAB", country: "Gabon" },
  { code: "GMB", country: "Gambia (the)" },
  { code: "GEO", country: "Georgia" },
  { code: "DEU", country: "Germany" },
  { code: "GHA", country: "Ghana" },
  { code: "GIB", country: "Gibraltar" },
  { code: "GRC", country: "Greece" },
  { code: "GRL", country: "Greenland" },
  { code: "GRD", country: "Grenada" },
  { code: "GLP", country: "Guadeloupe" },
  { code: "GUM", country: "Guam" },
  { code: "GTM", country: "Guatemala" },
  { code: "GGY", country: "Guernsey" },
  { code: "GIN", country: "Guinea" },
  { code: "GNB", country: "Guinea-Bissau" },
  { code: "GUY", country: "Guyana" },
  { code: "HTI", country: "Haiti" },
  { code: "HMD", country: "Heard Island and McDonald Islands" },
  { code: "VAT", country: "Holy See (the)" },
  { code: "HND", country: "Honduras" },
  { code: "HKG", country: "Hong Kong" },
  { code: "HUN", country: "Hungary" },
  { code: "ISL", country: "Iceland" },
  { code: "IND", country: "India" },
  { code: "IDN", country: "Indonesia" },
  { code: "IRN", country: "Iran (Islamic Republic of)" },
  { code: "IRQ", country: "Iraq" },
  { code: "IRL", country: "Ireland" },
  { code: "IMN", country: "Isle of Man" },
  { code: "ISR", country: "Israel" },
  { code: "ITA", country: "Italy" },
  { code: "JAM", country: "Jamaica" },
  { code: "JPN", country: "Japan" },
  { code: "JEY", country: "Jersey" },
  { code: "JOR", country: "Jordan" },
  { code: "KAZ", country: "Kazakhstan" },
  { code: "KEN", country: "Kenya" },
  { code: "KIR", country: "Kiribati" },
  { code: "PRK", country: "Korea (the Democratic People's Republic of)" },
  { code: "KOR", country: "Korea (the Republic of)" },
  { code: "KWT", country: "Kuwait" },
  { code: "KGZ", country: "Kyrgyzstan" },
  { code: "LAO", country: "Lao People's Democratic Republic (the)" },
  { code: "LVA", country: "Latvia" },
  { code: "LBN", country: "Lebanon" },
  { code: "LSO", country: "Lesotho" },
  { code: "LBR", country: "Liberia" },
  { code: "LBY", country: "Libya" },
  { code: "LIE", country: "Liechtenstein" },
  { code: "LTU", country: "Lithuania" },
  { code: "LUX", country: "Luxembourg" },
  { code: "MAC", country: "Macao" },
  { code: "MDG", country: "Madagascar" },
  { code: "MWI", country: "Malawi" },
  { code: "MYS", country: "Malaysia" },
  { code: "MDV", country: "Maldives" },
  { code: "MLI", country: "Mali" },
  { code: "MLT", country: "Malta" },
  { code: "MHL", country: "Marshall Islands (the)" },
  { code: "MTQ", country: "Martinique" },
  { code: "MRT", country: "Mauritania" },
  { code: "MUS", country: "Mauritius" },
  { code: "MYT", country: "Mayotte" },
  { code: "MEX", country: "Mexico" },
  { code: "FSM", country: "Micronesia (Federated States of)" },
  { code: "MDA", country: "Moldova (the Republic of)" },
  { code: "MCO", country: "Monaco" },
  { code: "MNG", country: "Mongolia" },
  { code: "MNE", country: "Montenegro" },
  { code: "MSR", country: "Montserrat" },
  { code: "MAR", country: "Morocco" },
  { code: "MOZ", country: "Mozambique" },
  { code: "MMR", country: "Myanmar" },
  { code: "NAM", country: "Namibia" },
  { code: "NRU", country: "Nauru" },
  { code: "NPL", country: "Nepal" },
  { code: "NLD", country: "Netherlands (the)" },
  { code: "NCL", country: "New Caledonia" },
  { code: "NZL", country: "New Zealand" },
  { code: "NIC", country: "Nicaragua" },
  { code: "NER", country: "Niger (the)" },
  { code: "NGA", country: "Nigeria" },
  { code: "NIU", country: "Niue" },
  { code: "NFK", country: "Norfolk Island" },
  { code: "MNP", country: "Northern Mariana Islands (the)" },
  { code: "NOR", country: "Norway" },
  { code: "OMN", country: "Oman" },
  { code: "PAK", country: "Pakistan" },
  { code: "PLW", country: "Palau" },
  { code: "PSE", country: "Palestine, State of" },
  { code: "PAN", country: "Panama" },
  { code: "PNG", country: "Papua New Guinea" },
  { code: "PRY", country: "Paraguay" },
  { code: "PER", country: "Peru" },
  { code: "PHL", country: "Philippines (the)" },
  { code: "PCN", country: "Pitcairn" },
  { code: "POL", country: "Poland" },
  { code: "PRT", country: "Portugal" },
  { code: "PRI", country: "Puerto Rico" },
  { code: "QAT", country: "Qatar" },
  { code: "MKD", country: "Republic of North Macedonia" },
  { code: "ROU", country: "Romania" },
  { code: "RUS", country: "Russian Federation (the)" },
  { code: "RWA", country: "Rwanda" },
  { code: "REU", country: "Réunion" },
  { code: "BLM", country: "Saint Barthélemy" },
  { code: "SHN", country: "Saint Helena, Ascension and Tristan da Cunha" },
  { code: "KNA", country: "Saint Kitts and Nevis" },
  { code: "LCA", country: "Saint Lucia" },
  { code: "MAF", country: "Saint Martin (French part)" },
  { code: "SPM", country: "Saint Pierre and Miquelon" },
  { code: "VCT", country: "Saint Vincent and the Grenadines" },
  { code: "WSM", country: "Samoa" },
  { code: "SMR", country: "San Marino" },
  { code: "STP", country: "Sao Tome and Principe" },
  { code: "SAU", country: "Saudi Arabia" },
  { code: "SEN", country: "Senegal" },
  { code: "SRB", country: "Serbia" },
  { code: "SYC", country: "Seychelles" },
  { code: "SLE", country: "Sierra Leone" },
  { code: "SGP", country: "Singapore" },
  { code: "SXM", country: "Sint Maarten (Dutch part)" },
  { code: "SVK", country: "Slovakia" },
  { code: "SVN", country: "Slovenia" },
  { code: "SLB", country: "Solomon Islands" },
  { code: "SOM", country: "Somalia" },
  { code: "ZAF", country: "South Africa" },
  { code: "SGS", country: "South Georgia and the South Sandwich Islands" },
  { code: "SSD", country: "South Sudan" },
  { code: "ESP", country: "Spain" },
  { code: "LKA", country: "Sri Lanka" },
  { code: "SDN", country: "Sudan (the)" },
  { code: "SUR", country: "Suriname" },
  { code: "SJM", country: "Svalbard and Jan Mayen" },
  { code: "SWE", country: "Sweden" },
  { code: "CHE", country: "Switzerland" },
  { code: "SYR", country: "Syrian Arab Republic" },
  { code: "TWN", country: "Taiwan" },
  { code: "TJK", country: "Tajikistan" },
  { code: "TZA", country: "Tanzania, United Republic of" },
  { code: "THA", country: "Thailand" },
  { code: "TLS", country: "Timor-Leste" },
  { code: "TGO", country: "Togo" },
  { code: "TKL", country: "Tokelau" },
  { code: "TON", country: "Tonga" },
  { code: "TTO", country: "Trinidad and Tobago" },
  { code: "TUN", country: "Tunisia" },
  { code: "TUR", country: "Turkey" },
  { code: "TKM", country: "Turkmenistan" },
  { code: "TCA", country: "Turks and Caicos Islands (the)" },
  { code: "TUV", country: "Tuvalu" },
  { code: "UGA", country: "Uganda" },
  { code: "UKR", country: "Ukraine" },
  { code: "ARE", country: "United Arab Emirates (the)" },
  {
    code: "GBR",
    country: "United Kingdom of Great Britain and Northern Ireland (the)",
  },
  { code: "UMI", country: "United States Minor Outlying Islands (the)" },
  { code: "USA", country: "United States of America (the)" },
  { code: "URY", country: "Uruguay" },
  { code: "UZB", country: "Uzbekistan" },
  { code: "VUT", country: "Vanuatu" },
  { code: "VEN", country: "Venezuela (Bolivarian Republic of)" },
  { code: "VNM", country: "Viet Nam" },
  { code: "VGB", country: "Virgin Islands (British)" },
  { code: "VIR", country: "Virgin Islands (U.S.)" },
  { code: "WLF", country: "Wallis and Futuna" },
  { code: "ESH", country: "Western Sahara" },
  { code: "YEM", country: "Yemen" },
  { code: "ZMB", country: "Zambia" },
  { code: "ZWE", country: "Zimbabwe" },
  { code: "ALA", country: "Åland Islands" },
];

enum FormType {
  Shipping,
  Billing,
}

interface FormProps {
  type: FormType;
  data: CommonInputs;
  onChange: (name: string, value: string) => void;
}

interface CommonInputs {
  name: {
    first: string;
    last: string;
  };
  address: {
    primary: string;
    secondary: string;
  };
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface BillingInputs extends CommonInputs {
  email: string;
}

interface ShippingInputs extends CommonInputs {}

const initialCommonInputs = {
  name: {
    first: "",
    last: "",
  },
  address: {
    primary: "",
    secondary: "",
  },
  city: "",
  province: "",
  postalCode: "",
  country: "",
  phone: "",
};

export default function CheckOut() {
  const cart = useCartSelector();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [sameAsBillingAddress, setSameAsBillingAddress] =
    useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>("");
  const [card, setCard] = useState<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cardInstance: any;
    let cancelled = false;

    async function initializeCard() {
      try {
        const { applicationId, locationId } = await getSquareConfig();
        if (cancelled || !window.Square) return;

        const payments = window.Square.payments(applicationId, locationId);
        cardInstance = await payments.card();
        if (cancelled) return;
        await cardInstance.attach(cardContainerRef.current);
        setCard(cardInstance);
      } catch (err) {
        console.error("Failed to initialize Square card form:", err);
        setCheckoutError(
          "Unable to load the payment form. Please refresh and try again."
        );
      }
    }

    initializeCard();

    return () => {
      cancelled = true;
      cardInstance?.destroy();
    };
  }, []);

  const [billingInputs, setBillingInputs] = useState<BillingInputs>({
    ...initialCommonInputs,
    email: "",
  });

  const [shippingInputs, setShippingInputs] =
    useState<ShippingInputs>(initialCommonInputs);

  const updateCommonInputs = (
    name: string,
    value: string,
    old: CommonInputs
  ): CommonInputs => {
    switch (name) {
      case "fname":
        return { ...old, name: { ...old.name, first: value } };
      case "lname":
        return { ...old, name: { ...old.name, last: value } };
      case "houseadd":
        return { ...old, address: { ...old.address, primary: value } };
      case "apartment":
        return { ...old, address: { ...old.address, secondary: value } };
      case "city":
        return { ...old, city: value };
      case "state":
        return { ...old, province: value };
      case "country":
        return { ...old, country: value };
      case "postal":
        return { ...old, postalCode: value };
      case "phone":
        return { ...old, phone: value };
      default:
        return old;
    }
  };

  const validateCheckoutForm = () => {
    const errors: string[] = [];

    if (!billingInputs.email) errors.push("Email is required");
    if (!billingInputs.name.first) errors.push("First name is required");
    if (!billingInputs.name.last) errors.push("Last name is required");
    if (!billingInputs.address.primary) errors.push("Address is required");
    if (!billingInputs.city) errors.push("City is required");
    if (!billingInputs.province) errors.push("State/Province is required");
    if (!billingInputs.postalCode) errors.push("Postal code is required");
    if (!billingInputs.country) errors.push("Country is required");

    if (!sameAsBillingAddress) {
      if (!shippingInputs.name.first)
        errors.push("Shipping first name is required");
      if (!shippingInputs.name.last)
        errors.push("Shipping last name is required");
      if (!shippingInputs.address.primary)
        errors.push("Shipping address is required");
      if (!shippingInputs.city) errors.push("Shipping city is required");
      if (!shippingInputs.province)
        errors.push("Shipping state/province is required");
      if (!shippingInputs.postalCode)
        errors.push("Shipping postal code is required");
      if (!shippingInputs.country) errors.push("Shipping country is required");
    }

    return errors;
  };

  const handleSquareCheckout = async () => {
    const validationErrors = validateCheckoutForm();
    if (validationErrors.length > 0) {
      setCheckoutError(validationErrors.join(", "));
      return;
    }

    if (cart.items.length === 0) {
      setCheckoutError("Your cart is empty");
      return;
    }

    if (!card) {
      setCheckoutError("Payment form is still loading. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    setCheckoutError("");

    try {
      const tokenResult = await card.tokenize();
      if (tokenResult.status !== "OK") {
        throw new Error(
          tokenResult.errors?.[0]?.message || "Card details are invalid"
        );
      }

      const amountCents = Math.round(calculateSubTotal(cart) * 100);
      const payment = await createPayment({
        sourceId: tokenResult.token,
        amount: amountCents,
        currency: "CAD",
        items: cart.items.map((i) => ({
          variationId: i.variationId,
          quantity: i.quantity,
        })),
      });

      dispatch(clearCart());

      const params = new URLSearchParams({
        orderId: payment.id,
        paymentId: payment.id,
        amount: (amountCents / 100).toFixed(2),
      });
      navigate(`/checkout/success?${params.toString()}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      setCheckoutError(error.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-container">
      {/* <div className="title">
        <h2>Product Order Forms</h2>
      </div> */}
      <div className="d-flex">
        <form action="" method="">
          <div>
            <div className="checkout-header">
              <h2>Billing Address</h2>
              <span className="required-notice">* denotes required fields</span>
            </div>
            <Form
              type={FormType.Billing}
              data={billingInputs}
              onChange={(name, value) =>
                setBillingInputs((old) => ({
                  ...old,
                  ...updateCommonInputs(name, value, old),
                }))
              }
            />
            <label>
              <span>
                Email Address <span className="required">*</span>
              </span>
              <input
                className="billing-email"
                value={billingInputs.email}
                onChange={(e) =>
                  setBillingInputs((old) => ({ ...old, email: e.target.value }))
                }
                type="email"
                name="email"
              />
            </label>
          </div>

          <div>
            <div className="checkout-header">
              <h2>Shipping Address</h2>
              <label>
                <input
                  type="checkbox"
                  className=""
                  checked={sameAsBillingAddress}
                  onChange={(e) => setSameAsBillingAddress(e.target.checked)}
                />
                <span className="mark-address">Same as Billing Address</span>
              </label>
              <span className="required-notice">* denotes required fields</span>
            </div>
            {!sameAsBillingAddress && (
              <Form
                type={FormType.Shipping}
                data={shippingInputs}
                onChange={(name, value) =>
                  setShippingInputs((old) =>
                    updateCommonInputs(name, value, old)
                  )
                }
              />
            )}
          </div>
        </form>
        <div className="Yorder">
          <table>
            <tbody>
              <tr>
                <th colSpan={2}>Your order</th>
              </tr>

              {cart.items.map((cartItem) => {
                return (
                  <tr key={cartItem.id}>
                    <td>
                      {" "}
                      {cartItem.name} x {cartItem.quantity}(Qty)
                    </td>
                    <td>${(cartItem.price * cartItem.quantity).toFixed(2)}</td>
                  </tr>
                );
              })}

              <tr>
                <td>Subtotal</td>
                <td>${calculateSubTotal(cart)}</td>
              </tr>
              <tr>
                <td>Shipping</td>
                <td>Free shipping</td>
              </tr>
            </tbody>
          </table>
          <br />

          <div className="checkout-section">
            <h3>Complete Your Order</h3>
            <p className="checkout-description">
              Enter your card details below to complete your payment securely
              via Square.
            </p>

            <div className="square-card-container" ref={cardContainerRef} />

            {checkoutError && (
              <div className="checkout-error">
                <p>❌ {checkoutError}</p>
                <button
                  onClick={() => setCheckoutError("")}
                  className="btn-dismiss"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="order-summary">
              <h4>Order Summary</h4>
              <div className="summary-row">
                <span>Items ({cart.items.length}):</span>
                <span>${calculateSubTotal(cart).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${calculateSubTotal(cart).toFixed(2)}</span>
              </div>
            </div>

            <div className="checkout-actions">
              <button
                className="btn-checkout-square"
                onClick={handleSquareCheckout}
                disabled={isProcessing || cart.items.length === 0 || !card}
              >
                {isProcessing ? (
                  <div className="processing">
                    <div className="spinner"></div>
                    Creating checkout session...
                  </div>
                ) : (
                  <div className="checkout-content">
                    <span className="square-logo">□</span>
                    Pay with Square
                    <span className="amount">
                      ${calculateSubTotal(cart).toFixed(2)}
                    </span>
                  </div>
                )}
              </button>

              <div className="payment-methods">
                <p>Accepted payment methods:</p>
                <div className="payment-icons">
                  <span className="payment-icon">💳</span>
                  <span className="payment-icon">📱</span>
                  <span className="payment-text">
                    Visa, Mastercard, Apple Pay, Google Pay & more
                  </span>
                </div>
              </div>

              <div className="security-notice">
                <p>
                  🔒 Your payment is secured by Square's industry-leading
                  encryption
                </p>
                <p>💯 100% secure checkout with fraud protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Form({ type, data, onChange }: FormProps) {
  const cssStr = type === FormType.Shipping ? "shipping" : "billing";

  const onInput = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) => onChange(e.target.name, e.target.value);

  return (
    <>
      <div className="form-group">
        <label>
          <span className="fname">
            First Name<span className="required">*</span>
          </span>
          <input
            value={data.name.first}
            onChange={onInput}
            className={`${cssStr}-fname`}
            type="text"
            name="fname"
          />
        </label>
        <label>
          <span className="lname">
            Last Name<span className="required">*</span>
          </span>
          <input
            value={data.name.last}
            onChange={onInput}
            className={`${cssStr}-lname`}
            type="text"
            name="lname"
          />
        </label>
      </div>

      <label>
        <span>
          Street Address <span className="required">*</span>
        </span>
        <input
          className={`${cssStr}-address`}
          value={data.address.primary}
          onChange={onInput}
          type="text"
          name="houseadd"
          placeholder="Street Address, P.O. Box"
          required
        />
      </label>
      <label>
        <span>Address 2&nbsp;</span>
        <input
          className={`${cssStr}-address2`}
          value={data.address.secondary}
          onChange={onInput}
          type="text"
          name="apartment"
          placeholder="Apartment, suite, unit etc. (optional)"
        />
      </label>
      <label>
        <span>
          Town / City <span className="required">*</span>
        </span>
        <input
          className={`${cssStr}-city`}
          value={data.city}
          onChange={onInput}
          type="text"
          name="city"
        />
      </label>
      <label>
        <span>
          State / Province <span className="required">*</span>
        </span>
        <input
          className={`${cssStr}-state`}
          value={data.province}
          onChange={onInput}
          type="text"
          name="state"
        />
      </label>
      <div className="form-group">
        <label>
          <span>
            Postal Code / ZIP <span className="required">*</span>
          </span>
          <input
            className={`${cssStr}-postal`}
            value={data.postalCode}
            onChange={onInput}
            type="text"
            name="postal"
          />
        </label>
        <label>
          <span>
            Country<span className="required">*</span>
          </span>
          <select
            value={data.country}
            className={`${cssStr}-country`}
            onChange={onInput}
            name="country"
          >
            <option value="">Select a country...</option>
            {countryCodes.map((data, i) => (
              <option key={i} value={data.country}>
                {data.country}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>
          Phone Number<span className="required">*</span>
        </span>
        <input
          className={`${cssStr}-phone`}
          value={data.phone}
          onChange={onInput}
          type="tel"
          name="phone"
        />
      </label>
    </>
  );
}
