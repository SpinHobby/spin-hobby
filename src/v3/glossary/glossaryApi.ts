// Calls to the glossary endpoints on the API (spin-hobby-server: src/modules/glossary).
// `api()` adds the server address, the signed-in user's token and JSON headers, and throws an Error with the
// server's message when the reply is not `success: true`.

import { api } from "../../lib/api";

/** One term as the API returns it. */
export interface GlossaryTerm {
  id: string;
  term: string;
  meaning: string;
}

/** `GET /glossary`: every term, A to Z. Anyone may call it. */
export async function fetchGlossary(): Promise<GlossaryTerm[]> {
  const res = await api<{ success: true; terms: GlossaryTerm[] }>("/glossary");
  return res.terms;
}

/** `POST /admin/glossary`: adds a term (staff only). Throws "… is already in the glossary." for a duplicate. */
export async function addGlossaryTerm(term: string, meaning: string): Promise<GlossaryTerm> {
  const res = await api<{ success: true; term: GlossaryTerm }>("/admin/glossary", {
    method: "POST",
    body: JSON.stringify({ term, meaning }),
  });
  return res.term;
}
