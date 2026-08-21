import axios from "axios";
import { adminAuthHeaders } from "./adminAuth";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface IEvent {
  id: number;
  dateLabel: string;
  title: string;
  location: string;
  link: string | null;
}

export function getEvents(): Promise<IEvent[]> {
  return axios.get(`${serverUrl}api/events`).then((response) => response.data.events || []);
}

// --- Admin ---

export interface IAdminEvent {
  id: number;
  date_label: string;
  title: string;
  location: string;
  link: string | null;
  sort_order: number;
  is_visible: boolean;
}

export function getAdminEvents(): Promise<IAdminEvent[]> {
  return axios
    .get(`${serverUrl}api/events/admin`, { headers: adminAuthHeaders() })
    .then((response) => response.data.events || []);
}

export function createEvent(params: {
  dateLabel: string;
  title: string;
  location: string;
  link?: string;
  sortOrder?: number;
}): Promise<IAdminEvent> {
  return axios
    .post(`${serverUrl}api/events/admin`, params, { headers: adminAuthHeaders() })
    .then((response) => response.data.event);
}

export function updateEvent(
  id: number,
  params: Partial<{
    dateLabel: string;
    title: string;
    location: string;
    link: string | null;
    sortOrder: number;
    isVisible: boolean;
  }>
): Promise<IAdminEvent> {
  return axios
    .put(`${serverUrl}api/events/admin/${id}`, params, { headers: adminAuthHeaders() })
    .then((response) => response.data.event);
}

export function deleteEvent(id: number): Promise<void> {
  return axios
    .delete(`${serverUrl}api/events/admin/${id}`, { headers: adminAuthHeaders() })
    .then(() => undefined);
}
