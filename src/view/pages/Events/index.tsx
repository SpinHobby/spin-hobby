import React from "react";
import "./events.scss";

const EVENTS = [
  {
    date: "April 4, 2026",
    title: "Rakku-Con Spring",
    location: "Genesis Centre, Calgary, AB",
    link: "https://www.instagram.com/rakkucon/",
  },
  {
    date: "April 4, 2026",
    title: "@Aidi birthing",
    location: "Greater Vancouver Metro, BC",
    link: "https://www.instagram.com/arguingcrab",
  },
  {
    date: "April 23-26, 2026",
    title: "Calgary Expo",
    location: "Stampede Park, Calgary, AB",
    link: "https://downtowncalgary.com/",
  },
  {
    date: "June 13, 2026",
    title: "AniYeg",
    location: "Mill Woods Town Centre, Edmonton, AB",
    link: "https://www.onlytogether.tv/aniyeg",
  },
  {
    date: "June 16-17, 2026",
    title: "Stephen Avenue Pop Up",
    location: "Stephen Avenue 100 block (in front of Winners), Calgary, AB",
    link: "https://fanexpohq.com/calgaryexpo/",
  },
  {
    date: "June 19-21, 2026",
    title: "Game Con",
    location: "Edmonton Expo Centre, Edmonton, AB",
    link: "https://gameconcanada.com/",
  },
  {
    date: "June 27-28, 2026",
    title: "Kelowna Comicon",
    location: "MNP Place, Kelowna, BC",
    link: "https://www.kelownacomicon.com/",
  },
  {
    date: "July 4-5, 2026",
    title: "Ganbatte Con Canada",
    location: "TCU Place, Saskatoon, SK",
    link: "https://ganbatte.ca/",
  },
  {
    date: "July 17-18, 2026",
    title: "Omatsuri (Calgary Japanese Festival)",
    location: "Max Bell Centre, Calgary, AB",
    link: "https://calgaryjca.com/omatsuri/",
  },
  {
    date: "July 31 - August 2, 2026",
    title: "AniRevo (Anime Revolution)",
    location: "Vancouver Convention Centre, Vancouver, BC",
    link: "https://summer.animerevolution.ca/",
  },
  {
    date: "August 1-3, 2026",
    title: "Heritage Festival (Japan Pavilion)",
    location: "Hawrelak Park, Edmonton, AB",
    link: "https://heritagefest.ca/",
  },
  {
    date: "August 7-9, 2026",
    title: "Animethon",
    location: "Edmonton Convention Centre, Edmonton, AB",
    link: "https://animethon.org/",
  },
  {
    date: "August 15, 2026",
    title: "Chinatown Street Festival",
    location: "Chinatown, Calgary, AB",
    link: "https://www.calgarychinatown.com/",
  },
  {
    date: "September 18-20, 2026",
    title: "Edmonton Expo",
    location: "Edmonton Expo Centre, Edmonton, AB",
    link: "https://fanexpohq.com/edmontonexpo/",
  },
  {
    date: "September 26, 2026",
    title: "Rakku-Con Fall",
    location: "Genesis Centre, Calgary, AB",
    link: "https://www.instagram.com/rakkucon/",
    note: "Application not opened yet",
  },
];

export default function Events() {
  return (
    <div className="events-page">
      <div className="events-header">
        <div className="events-header-content">
          <h1>Events</h1>
          <p>Find us at these conventions and community events across Canada</p>
        </div>
      </div>

      <div className="events-content">
        <div className="events-list">
          {EVENTS.map((event, i) => (
            <div className="event-card" key={i}>
              <div className="event-date">{event.date}</div>
              <h3>{event.title}</h3>
              <div className="event-location">📍 {event.location}</div>
              {event.note && <p className="event-note">{event.note}</p>}
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="event-link"
              >
                Learn More →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
