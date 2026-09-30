// Terms of Service + Privacy Policy content for spinhobby.com.
//
// IMPORTANT: this is standard, reasonable e-commerce boilerplate, not legal
// advice. Have a lawyer licensed in Alberta review it before relying on it -
// in particular the arbitration/dispute clause, since Canadian consumer-
// protection law in several provinces limits how enforceable a mandatory
// arbitration or class-action waiver is against a consumer. Update the
// bracketed placeholders (legal entity name, return-window days, etc.) to
// match your actual business details and practices.

import { SUPPORT_EMAIL } from "../links";

export interface LegalSection {
  heading: string;
  body: string[]; // one paragraph per array entry; may include "\n- " bullet lines
}

export const LEGAL_ENTITY = "Spin Hobby";
export const LEGAL_JURISDICTION = "the Province of Alberta, Canada";
export const LAST_UPDATED = "September 30, 2026";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Agreement to these Terms",
    body: [
      `These Terms of Service ("Terms") are a legal agreement between you and ${LEGAL_ENTITY} ("Spin Hobby", "we", "us", "our") governing your use of spinhobby.com and any purchase you make through it (together, the "Site"). By browsing the Site, creating an account, or placing an order, you agree to these Terms. If you do not agree, please do not use the Site.`,
      "We may update these Terms from time to time (see Section 15). Continued use of the Site after an update means you accept the revised Terms.",
    ],
  },
  {
    heading: "2. Eligibility and Accounts",
    body: [
      "You must be able to form a legally binding contract to use the Site. If you are under the age of majority in your province or territory, you may use the Site only with the involvement of a parent or guardian.",
      "You are responsible for keeping your account credentials confidential and for all activity under your account. Sign-in is available via Google, Discord, or email/password. Let us know right away at the contact below if you suspect unauthorized access to your account.",
    ],
  },
  {
    heading: "3. Products, Pricing & Availability",
    body: [
      "We sell anime figures, plushies, trading cards, and related merchandise, including pre-order items manufactured by third parties. Product photos are for reference; packaging, box art, and minor manufacturing variations can differ from what's pictured.",
      "Pre-order release dates are estimates provided by manufacturers/distributors and are frequently delayed or, occasionally, cancelled. We do our best to keep pre-order timelines current but do not guarantee any specific release or delivery date.",
      "Prices are listed in CAD or USD as selected on the Site and may change at any time without notice, including after you've added an item to your cart but before you complete checkout. We make reasonable efforts to display accurate pricing and stock levels but do not guarantee the Site is error-free; if we discover a pricing or listing error on an order you've placed, we will contact you before charging or shipping and you may cancel that order at no cost.",
    ],
  },
  {
    heading: "4. Orders & Payment",
    body: [
      "Placing an order is an offer to buy; we may accept or decline any order for any reason, including suspected fraud, stock errors, or pricing errors, in which case we'll refund any amount already charged.",
      "Payments are processed by Square and/or PayPal. We do not store your full card number on our servers - it's handled directly by those payment processors under their own terms and security standards.",
      "You're responsible for providing accurate billing and shipping information. We are not liable for orders misdirected because of information you entered incorrectly.",
    ],
  },
  {
    heading: "5. Shipping, Customs & Delivery",
    body: [
      "We ship within Canada and to the United States. Estimated delivery times shown on the Site are estimates only, not guarantees - carrier delays, customs processing, weather, and similar events are outside our control.",
      "For international shipments (including cross-border shipments to the US), you are the importer of record and are responsible for any customs duties, taxes, or brokerage fees charged by your country on arrival. These are not included in the price you pay us.",
      "Risk of loss and title to items pass to you once the carrier accepts the package from us. If a package is lost or damaged in transit, contact us and we'll help you file a claim with the carrier, but we are not the insurer of your shipment.",
    ],
  },
  {
    heading: "6. Returns, Refunds & Cancellations",
    body: [
      "If an item arrives defective, damaged, or materially different from what was described, contact us within [14] days of delivery with photos and your order number, and we'll arrange a replacement, refund, or store credit at our discretion.",
      "Because pre-orders are placed with manufacturers/distributors in advance, pre-order cancellations after a payment or deposit has been processed may not be fully refundable once we've committed funds upstream - the applicable cancellation terms will be shown at checkout for that item.",
      "Sealed collectibles, trading cards, and similar items are not eligible for change-of-mind returns once opened. This section does not limit any return/refund right you have under applicable consumer-protection law that cannot be waived by agreement.",
    ],
  },
  {
    heading: "7. Intellectual Property",
    body: [
      "The Site's design, text, graphics, and the Spin Hobby name and logo are owned by us or our licensors and may not be copied or used without permission.",
      "Character names, series titles, and artwork on the products we sell are trademarks and copyrighted works of their respective owners (manufacturers, publishers, and rights holders). Spin Hobby is an independent retailer; we are not affiliated with, sponsored by, or endorsed by those rights holders unless explicitly stated on a specific product page.",
    ],
  },
  {
    heading: "8. Acceptable Use",
    body: [
      "You agree not to: use the Site for any unlawful purpose; attempt to gain unauthorized access to our systems or another user's account; scrape or bulk-harvest data from the Site; interfere with the Site's normal operation (including attempting to disrupt checkout, payments, or inventory systems); or submit false or fraudulent order or payment information.",
      "We may suspend or terminate access to the Site for anyone who violates these Terms.",
    ],
  },
  {
    heading: "9. Third-Party Services",
    body: [
      "The Site integrates with third-party services, including Google and Discord (sign-in), Square and PayPal (payments), and our Discord community server. Your use of those services is also governed by their own terms and privacy policies, which we don't control.",
      "Links to third-party sites (for example, our eBay store or Discord server) are provided for convenience. We aren't responsible for the content, policies, or practices of sites we don't operate.",
    ],
  },
  {
    heading: "10. Disclaimer of Warranties",
    body: [
      `To the fullest extent permitted by law, the Site and all products are provided "as is" and "as available," without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We don't warrant that the Site will be uninterrupted, secure, or error-free.`,
      "Nothing in this section excludes or limits any warranty or condition that cannot lawfully be excluded under applicable consumer-protection legislation in your province or territory.",
    ],
  },
  {
    heading: "11. Limitation of Liability",
    body: [
      `To the fullest extent permitted by law, ${LEGAL_ENTITY} and its owners, staff, and contractors will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenue, arising out of or related to your use of the Site or any product purchased through it, even if we've been advised of the possibility of such damages.`,
      "To the fullest extent permitted by law, our total liability for any claim arising from your use of the Site or a purchase will not exceed the amount you actually paid us for the product(s) giving rise to the claim.",
      "This limitation does not apply where it would be unlawful under applicable consumer-protection legislation, including for gross negligence, willful misconduct, or death or personal injury caused by our negligence, to the extent such liability cannot be excluded by law.",
    ],
  },
  {
    heading: "12. Indemnification",
    body: [
      `You agree to indemnify and hold ${LEGAL_ENTITY} harmless from any claims, losses, or expenses (including reasonable legal fees) arising from your violation of these Terms or misuse of the Site.`,
    ],
  },
  {
    heading: "13. Disputes & Governing Law",
    body: [
      `These Terms are governed by the laws of ${LEGAL_JURISDICTION}, without regard to conflict-of-law rules.`,
      "Before starting any formal proceeding, please contact us at the email below - most issues (a wrong item, a shipping question, a pricing error) can be resolved quickly and directly without needing to go further.",
      `If a dispute can't be resolved informally, it will be subject to the exclusive jurisdiction of the courts located in ${LEGAL_JURISDICTION}, except where applicable law gives you the right to bring a claim in your own local court or through a consumer-protection tribunal, which this section does not override.`,
    ],
  },
  {
    heading: "14. Severability",
    body: [
      "If any part of these Terms is found unenforceable, the rest remains in full effect, and the unenforceable part will be read to reflect the parties' original intent as closely as possible.",
    ],
  },
  {
    heading: "15. Changes to these Terms",
    body: [
      "We may revise these Terms at any time by posting an updated version on this page with a new effective date. Material changes will be flagged on the Site. Continued use of the Site after changes take effect is acceptance of the new Terms.",
    ],
  },
  {
    heading: "16. Contact Us",
    body: [
      `Questions about these Terms? Reach us at ${SUPPORT_EMAIL}.`,
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Overview",
    body: [
      `This Privacy Policy explains what personal information ${LEGAL_ENTITY} collects through spinhobby.com, how we use it, and the choices you have. It's written to comply with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) and comparable provincial law.`,
    ],
  },
  {
    heading: "2. Information We Collect",
    body: [
      "Account information: name, email address, and profile picture, either entered directly or provided by Google/Discord when you sign in with those providers.",
      "Order information: shipping and billing address, phone number, and order/purchase history.",
      "Payment information: handled directly by Square and/or PayPal. We do not receive or store your full card number.",
      "Support communications: anything you send us by email or through the Site's contact/support channels.",
      "Technical information: IP address, browser/device type, and basic usage data collected automatically to keep the Site secure and working correctly.",
    ],
  },
  {
    heading: "3. How We Use Your Information",
    body: [
      "To process and fulfill your orders, including shipping, customer support, and order-status communications.",
      "To manage your account, including sign-in via Google or Discord.",
      "To send transactional emails (order confirmations, shipping notices, restock alerts you've opted into) and, only with your consent, marketing updates.",
      "To detect and prevent fraud, abuse, and security issues.",
      "To improve the Site's products, content, and performance.",
    ],
  },
  {
    heading: "4. Who We Share Information With",
    body: [
      "We don't sell your personal information. We share it only with the service providers needed to run the Site and fulfill your order:",
      "- Square and PayPal, to process payments.\n- Supabase, our hosting, authentication, and file-storage provider.\n- Resend, to deliver transactional emails.\n- Google and Discord, if you choose to sign in using those providers.\n- Shipping carriers, to deliver your order.",
      "We may also disclose information if required by law, to protect our legal rights, or in connection with a business transfer (such as a sale of the business), in which case this policy would continue to apply to your information under the new owner.",
    ],
  },
  {
    heading: "5. Cookies & Similar Technologies",
    body: [
      "We use essential cookies/local storage to keep you signed in, remember your cart, and remember preferences like your selected currency and light/dark theme. We don't use third-party advertising trackers.",
    ],
  },
  {
    heading: "6. Data Retention",
    body: [
      "We keep account and order records for as long as needed to provide the Site, comply with tax/accounting obligations, and resolve disputes, after which we delete or anonymize it.",
    ],
  },
  {
    heading: "7. Your Rights",
    body: [
      "You can ask us to access, correct, or delete the personal information we hold about you, or withdraw consent for marketing emails at any time (every marketing email includes an unsubscribe link). To make a request, email " + SUPPORT_EMAIL + " - we'll respond within a reasonable time and may need to verify your identity first.",
      "Deleting account information tied to an active or recent order may affect our ability to help with warranty, return, or shipping issues on that order.",
    ],
  },
  {
    heading: "8. Data Security",
    body: [
      "We use industry-standard measures (encrypted connections, access controls, and reputable third-party infrastructure) to protect your information, but no online service can guarantee perfect security. Please use a strong, unique password for your account.",
    ],
  },
  {
    heading: "9. Children's Privacy",
    body: [
      "The Site is not directed at children under 13, and we don't knowingly collect personal information from them. If you believe a child has provided us information, contact us and we'll delete it.",
    ],
  },
  {
    heading: "10. Changes to this Policy",
    body: [
      "We may update this policy from time to time; the effective date at the top will reflect the latest version. Material changes will be flagged on the Site.",
    ],
  },
  {
    heading: "11. Contact Us",
    body: [
      `Questions about this Privacy Policy, or a request about your data? Email ${SUPPORT_EMAIL}.`,
    ],
  },
];
