import React, { useEffect, useState } from "react";
import { getEvents, IEvent } from "api/events";
import "./events.scss";

export default function Events() {
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message || "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="events-page">
      <div className="events-header">
        <div className="events-header-content">
          <h1>Events</h1>
          <p>Find us at these conventions and community events across Canada</p>
        </div>
      </div>

      <div className="events-content">
        {error && <p className="events-error">{error}</p>}
        {!loading && !error && events.length === 0 && <p>No events listed right now.</p>}
        <div className="events-list">
          {events.map((event) => (
            <div className="event-card" key={event.id}>
              <div className="event-date">{event.dateLabel}</div>
              <h3>{event.title}</h3>
              <div className="event-location">📍 {event.location}</div>
              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-link"
                >
                  Learn More →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
