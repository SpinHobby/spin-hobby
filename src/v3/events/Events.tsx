import { useLocation } from "react-router-dom";
import "./events.scss";
import { DISCORD_URL, INSTAGRAM_URL } from "../links";
import { useDocumentHead } from "../seo";
import { EVENTS, type EventInfo } from "./data";
import { eventDateLabel, eventPlace, isPastEvent } from "./dates";

function EventCard({ e, past }: { e: EventInfo; past?: boolean }) {
  const place = eventPlace(e);
  return (
    <li className={`ev-card ${past ? "is-past" : ""}`}>
      <div className="ev-date">{eventDateLabel(e.start, e.end)}</div>
      <h3>{e.name}</h3>
      {place && <div className="ev-place"><span aria-hidden>📍</span> {place}</div>}
      <a className="ev-link" href={e.link} target="_blank" rel="noopener noreferrer">Learn more →</a>
    </li>
  );
}

export default function Events() {
  const { pathname } = useLocation();

  useDocumentHead({
    title: "Events | Spin Hobby",
    description: "Find Spin Hobby at anime conventions and community events across Canada: dates, venues and links.",
    path: pathname,
  });

  const upcoming = EVENTS.filter((e) => !isPastEvent(e));
  const past = EVENTS.filter((e) => isPastEvent(e)).reverse(); // most recent first

  return (
    <main className="ev-wrap">
      <a href="/" className="ev-back">← Back to the store</a>
      <h1>Events</h1>
      <p className="ev-lead">Find us at these conventions and community events across Canada.</p>

      <section aria-labelledby="ev-upcoming">
        <h2 id="ev-upcoming" className="ev-h2">Upcoming</h2>
        {upcoming.length ? (
          <ul className="ev-list">{upcoming.map((e) => <EventCard key={e.name + e.start} e={e} />)}</ul>
        ) : (
          <p className="ev-note">
            No upcoming events are scheduled right now. New dates are announced on our{" "}
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a> and{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="ev-past">
          <h2 id="ev-past" className="ev-h2">Past events</h2>
          <ul className="ev-list">{past.map((e) => <EventCard key={e.name + e.start} e={e} past />)}</ul>
        </section>
      )}
    </main>
  );
}
