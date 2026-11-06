import { Link, useLocation } from "react-router-dom";
import "./about.scss";
import { DISCORD_URL, EBAY_URL, INSTAGRAM_URL, SHOW_EBAY_STORE, SUPPORT_EMAIL } from "../links";
import { useDocumentHead } from "../seo";
import { handlingLabel } from "../format";
import { freeShippingLabel, useStoreConfig } from "../storeConfig";
import { homeCopy } from "../storefront/landing";
import { EVENTS } from "../events/data";
import { eventDateLabel, eventPlace, isPastEvent } from "../events/dates";

/**
 * /about: who the shop is, what it promises, where to meet it, and how to reach it. Only facts the shop already states elsewhere
 * (the homepage, footer, Support and Events), so nothing here can drift from what the shop actually does. A team or shop photo
 * would make it warmer; add one here when there is one.
 */
export default function About() {
  const { pathname } = useLocation();
  useStoreConfig(); // shipping and handling numbers come from the shop's settings
  useDocumentHead({
    title: "About us | Spin Hobby",
    description: "Spin Hobby is a Canadian shop for authentic, officially licensed anime figures, plushies and goods, since 2022.",
    path: pathname,
  });
  const upcoming = EVENTS.filter((e) => !isPastEvent(e)).slice(0, 4);
  const shown = upcoming.length
    ? upcoming
    : EVENTS.filter((e) => isPastEvent(e))
        .reverse()
        .slice(0, 4);

  const promises: [string, string][] = [
    ["Authentic only", "Officially licensed figures, plushies, cards and goods. No bootlegs, ever."],
    ["Packed for collectors", `Every order is packed with care for collectors, and ships in ${handlingLabel()}.`],
    ["Tracked across Canada & the US", `Every parcel is tracked, and shipping is free over ${freeShippingLabel()}.`],
    ["Pre-orders you can count on", "Reserve upcoming releases before they sell out; they ship the day they reach us."],
  ];

  return (
    <main className="ab-wrap">
      <p className="sh-eyebrow">About us</p>
      <h1 className="sh-display">Anime merch from fans, for fans, since 2022</h1>
      <p className="ab-lead">{homeCopy().intro}</p>

      <section aria-labelledby="ab-promise">
        <h2 id="ab-promise" className="sh-display ab-h2">
          What we promise
        </h2>
        <ul className="ab-promises">
          {promises.map(([title, text]) => (
            <li key={title}>
              <b>{title}</b>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {shown.length > 0 && (
        <section aria-labelledby="ab-events">
          <h2 id="ab-events" className="sh-display ab-h2">
            Meet us in person
          </h2>
          <p className="ab-text">You&apos;ll find our table at anime conventions and community events.</p>
          <ul className="ab-events">
            {shown.map((e) => (
              <li key={e.name + e.start}>
                <b>{e.name}</b>
                <span>
                  {eventDateLabel(e.start, e.end)}
                  {eventPlace(e) ? ` · ${eventPlace(e)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/events" className="ab-more">
            All events →
          </Link>
        </section>
      )}

      <section aria-labelledby="ab-community">
        <h2 id="ab-community" className="sh-display ab-h2">
          Join the community
        </h2>
        <p className="ab-text">Restock alerts and exclusive drops go to our community first.</p>
        <div className="ab-links">
          <a className="sh-btn" href={DISCORD_URL} target="_blank" rel="noreferrer">
            Discord
          </a>
          <a className="sh-btn sh-btn--ghost" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Instagram
          </a>
          {SHOW_EBAY_STORE && (
            <a className="sh-btn sh-btn--ghost" href={EBAY_URL} target="_blank" rel="noreferrer">
              eBay store
            </a>
          )}
        </div>
      </section>

      <section aria-labelledby="ab-contact">
        <h2 id="ab-contact" className="sh-display ab-h2">
          Talk to us
        </h2>
        <p className="ab-text">
          Questions about an order, a pre-order or something you can&apos;t find? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or visit <Link to="/support">Help &amp; support</Link>.
        </p>
      </section>
    </main>
  );
}
