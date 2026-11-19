import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, EmptyState, TextareaField, TextField } from "../../components";
import { addGlossaryTerm, fetchGlossary, type GlossaryTerm } from "./glossaryApi";

/** Admin > Homepage: the collector's glossary shown at /glossary. Staff add terms here. */
export function GlossaryCard({ flash }: { flash: (message: string) => void }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGlossary()
      .then(setTerms)
      .catch((e: unknown) => flash(e instanceof Error ? e.message : "The glossary could not be loaded."));
  }, [flash]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const added = await addGlossaryTerm(term.trim(), meaning.trim());
      // Keep the list A to Z, as the API sends it.
      setTerms((list) => [...list, added].sort((a, b) => a.term.localeCompare(b.term)));
      setTerm("");
      setMeaning("");
      flash(`Added "${added.term}"`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Collector's glossary" padded>
      <form onSubmit={add}>
        <TextField label="Term" value={term} maxLength={80} required onChange={(e) => setTerm(e.target.value)} />
        <TextareaField
          label="What it means"
          value={meaning}
          maxLength={1000}
          rows={2}
          required
          onChange={(e) => setMeaning(e.target.value)}
        />
        <Button type="submit" size="sm" loading={saving} disabled={!term.trim() || !meaning.trim()}>
          Add term
        </Button>
      </form>
      {terms.length === 0 ? (
        <EmptyState>No terms yet.</EmptyState>
      ) : (
        <ul className="ad-muted ad-sm">
          {terms.map((t) => (
            <li key={t.id}>
              <strong>{t.term}</strong>: {t.meaning}
            </li>
          ))}
        </ul>
      )}
      <div className="ad-muted ad-sm">
        Shoppers see these at <a href="/glossary">/glossary</a>, A to Z.
      </div>
    </Card>
  );
}
