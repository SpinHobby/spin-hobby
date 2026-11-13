import { useCallback, useEffect, useState } from "react";
import { fetchHello } from "./helloApi";

export default function Hello() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchHello()
      .then((m) => {
        console.log("response from server:", m);
        setMessage(m);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed."));
  }, []);

  useEffect(load, [load]);

  return (
    <main>
      <h1>REST API sample</h1>
      {error ? <p>Error: {error}</p> : <p>{message ?? "Loading..."}</p>}
    </main>
  );
}
