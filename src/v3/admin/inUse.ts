/**
 * Whether this admin window is the one being used: in view and focused. Screens that look for news on a timer only look then, so tabs left
 * open in the background ask the server nothing (every open admin tab polling every 5-10 seconds ran the shop's database over its free
 * monthly egress in two days, 2026-11-20).
 */
export const inUse = (): boolean => document.visibilityState === "visible" && document.hasFocus();
