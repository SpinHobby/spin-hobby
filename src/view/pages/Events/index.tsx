import React from "react";
import "./events.scss";

// Placeholder events. Swap for real admin-managed content later.
const EVENTS = [
  {
    date: "Aug 23-24, 2026",
    title: "Anime North Pop-Up Booth",
    location: "Toronto, ON",
    description:
      "Visit our booth for exclusive convention-only figures and 15% off storewide.",
  },
  {
    date: "Sep 5, 2026",
    title: "New Arrivals Restock",
    location: "Online",
    description:
      "Fresh shipment of Demon Slayer and Jujutsu Kaisen figures drops at 12 PM EST.",
  },
  {
    date: "Sep 20, 2026",
    title: "Discord Community Giveaway",
    location: "Online",
    description:
      "Join our Discord for a chance to win a Nendoroid of your choice.",
  },
];

export default function Events() {
  return (
    <div className="events-page">
      <div className="events-header">
        <div className="events-header-content">
          <h1>Events</h1>
          <p>Conventions, restocks, and community giveaways from Spin Hobby</p>
        </div>
      </div>

      <div className="events-content">
        <div className="events-list">
          {EVENTS.map((event, i) => (
            <div className="event-card" key={i}>
              <div className="event-date">{event.date}</div>
              <h3>{event.title}</h3>
              <div className="event-location">📍 {event.location}</div>
              <p>{event.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
