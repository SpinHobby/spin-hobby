import { api, refreshSessionUser } from "../../lib/api";
import type { AppUser } from "../types";

/** Loads the signed-in account again, so the header, Rewards and product pages see a confirmed email or new name at once. */
export async function reloadUser() {
  const me = await api<{ user: AppUser }>("/auth/me");
  refreshSessionUser(me.user);
  return me.user;
}
