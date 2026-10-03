// The conventions and community events Spin Hobby attends. A fixed list for now: edit it here and redeploy.
// Keep it in date order. Dates are YYYY-MM-DD; `end` is omitted for one-day events.

export interface EventInfo {
  name: string;
  venue?: string;
  city: string;
  start: string;
  end?: string;
  link: string;
}

export const EVENTS: EventInfo[] = [
  { name: "Rakku-Con Spring", venue: "Genesis Centre", city: "Calgary, AB", start: "2026-04-04", link: "https://www.instagram.com/rakkucon/" },
  { name: "Calgary Expo", venue: "Stampede Park", city: "Calgary, AB", start: "2026-04-23", end: "2026-04-26", link: "https://fanexpohq.com/calgaryexpo/" },
  { name: "AniYeg", venue: "Mill Woods Town Centre", city: "Edmonton, AB", start: "2026-06-13", link: "https://www.onlytogether.tv/aniyeg" },
  { name: "Stephen Avenue Pop Up", venue: "Stephen Avenue 100 block (in front of Winners)", city: "Calgary, AB", start: "2026-06-16", end: "2026-06-17", link: "https://downtowncalgary.com/" },
  { name: "Game Con", venue: "Edmonton Expo Centre", city: "Edmonton, AB", start: "2026-06-19", end: "2026-06-21", link: "https://gameconcanada.com/" },
  { name: "Kelowna Comicon", venue: "MNP Place", city: "Kelowna, BC", start: "2026-06-27", end: "2026-06-28", link: "https://www.kelownacomicon.com/" },
  { name: "Ganbatte Con Canada", venue: "TCU Place", city: "Saskatoon, SK", start: "2026-07-04", end: "2026-07-05", link: "https://ganbatte.ca/" },
  { name: "Omatsuri (Calgary Japanese Festival)", venue: "Max Bell Centre", city: "Calgary, AB", start: "2026-07-17", end: "2026-07-18", link: "https://calgaryjca.com/omatsuri/" },
  { name: "AniRevo (Anime Revolution)", venue: "Vancouver Convention Centre", city: "Vancouver, BC", start: "2026-07-31", end: "2026-08-02", link: "https://summer.animerevolution.ca/" },
  { name: "Heritage Festival (Japan Pavilion)", venue: "Hawrelak Park", city: "Edmonton, AB", start: "2026-08-01", end: "2026-08-03", link: "https://heritagefest.ca/" },
  { name: "Animethon", venue: "Edmonton Convention Centre", city: "Edmonton, AB", start: "2026-08-07", end: "2026-08-09", link: "https://animethon.org/" },
  { name: "Karuta Alley Market", city: "Calgary, AB", start: "2026-08-14", end: "2026-08-15", link: "https://www.karutaalleymarket.com/" },
  { name: "Chinatown Street Festival", venue: "Chinatown", city: "Calgary, AB", start: "2026-08-15", link: "https://www.calgarychinatown.com/" },
  { name: "Edmonton Expo", venue: "Edmonton Expo Centre", city: "Edmonton, AB", start: "2026-09-18", end: "2026-09-20", link: "https://fanexpohq.com/edmontonexpo/" },
  { name: "Rakku-Con Fall", venue: "Genesis Centre", city: "Calgary, AB", start: "2026-09-26", link: "https://www.instagram.com/rakkucon/" },
];
