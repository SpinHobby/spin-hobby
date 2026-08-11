type Listener = (isDown: boolean) => void;

let isDown = false;
const listeners = new Set<Listener>();

export function reportBackendDown() {
  if (isDown) return;
  isDown = true;
  listeners.forEach((listener) => listener(true));
}

export function reportBackendUp() {
  if (!isDown) return;
  isDown = false;
  listeners.forEach((listener) => listener(false));
}

export function subscribeBackendStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
