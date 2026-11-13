import { api } from "../../lib/api";

/** `GET /hello`: returns a message from the server. */
export async function fetchHello(): Promise<string> {
  const res = await api<{ success: true; message: string }>("/hello");
  return res.message;
}
