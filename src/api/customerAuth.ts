import axios from "axios";
import { IAuthUser } from "../ts";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

interface ICustomerResponse {
  id: number;
  email: string;
  fname: string | null;
  lname: string | null;
  avatarUrl: string | null;
}

function toAuthUser(
  customer: ICustomerResponse,
  authType: "google" | "discord"
): IAuthUser {
  return {
    id: String(customer.id),
    email: customer.email,
    fname: customer.fname || undefined,
    lname: customer.lname || undefined,
    avatarUrl: customer.avatarUrl || undefined,
    authType,
    loginAt: new Date().toISOString(),
  };
}

export function postGoogleLogin(idToken: string): Promise<IAuthUser> {
  return axios
    .post(
      `${serverUrl}api/auth/oauth/google`,
      { idToken },
      { withCredentials: true }
    )
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Login failed");
      return toAuthUser(response.data.customer, "google");
    });
}

export function postDiscordLogin(code: string, redirectUri: string): Promise<IAuthUser> {
  return axios
    .post(
      `${serverUrl}api/auth/oauth/discord`,
      { code, redirectUri },
      { withCredentials: true }
    )
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Login failed");
      return toAuthUser(response.data.customer, "discord");
    });
}

export function getLinkedProviders(): Promise<string[]> {
  return axios
    .get(`${serverUrl}api/auth/me`, { withCredentials: true })
    .then((response) => (response.data.success ? response.data.linkedProviders || [] : []))
    .catch(() => []);
}

export function getMe(): Promise<IAuthUser | null> {
  return axios
    .get(`${serverUrl}api/auth/me`, { withCredentials: true })
    .then((response) => {
      if (!response.data.success) return null;
      const authType: "google" | "discord" =
        response.data.linkedProviders?.[0] === "discord" ? "discord" : "google";
      return toAuthUser(response.data.customer, authType);
    })
    .catch(() => null);
}

export function postLogout(): Promise<void> {
  return axios
    .post(`${serverUrl}api/auth/logout`, {}, { withCredentials: true })
    .then(() => undefined);
}
