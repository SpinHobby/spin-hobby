/** The logo choice last seen on this device (the storefront keeps the whole layout under this key; see Storefront.tsx). */
export function readLogoChoice(): "badge" | "wordmark" {
  try {
    const layout = JSON.parse(localStorage.getItem("spinhobby-layout") ?? "null");
    return layout?.logo === "wordmark" ? "wordmark" : "badge";
  } catch {
    return "badge";
  }
}
