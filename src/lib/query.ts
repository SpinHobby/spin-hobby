// Server data the pages read (TanStack Query): fetched once, shared by every component that asks for it, kept for a while
// after the page that asked has gone (so Back shows the list at once), and refreshed quietly when it has gone stale.
//
// To read from the API in a component:
//
//   const orders = useQuery({ queryKey: ["orders", status], queryFn: () => api<OrderList>(`/orders?status=${status}`) });
//   orders.data, orders.isPending, orders.error
//
// The key names the data: every value the address depends on goes in it. After a change is saved, refresh what it touched:
//
//   await api("/orders/42/ship", { method: "POST", body });
//   queryClient.invalidateQueries({ queryKey: ["orders"] });
//
// New pages should read this way; existing pages move over when they are next worked on.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long an answer counts as fresh. Within it, a page that asks again gets the saved answer and no request is made;
      // after it, the saved answer shows at once and a fresh one replaces it. Stock moves, so this stays short.
      staleTime: 30_000,
      // Saved answers nobody is showing are dropped after five minutes.
      gcTime: 5 * 60_000,
      // No extra retries here: api() already waits for a sleeping or restarting server and tries a read again
      // (src/lib/serverStatus.ts), and an answer like "not found" is final.
      retry: false,
    },
  },
});

/** The message of a failed read, as the pages show it (`null`: no failure). */
export const errorMessage = (error: unknown) => (error ? (error instanceof Error ? error.message : String(error)) : null);
