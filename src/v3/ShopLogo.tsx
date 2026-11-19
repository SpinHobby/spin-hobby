import { useStoreConfig } from "./storeConfig";
import { readLogoChoice } from "./logoChoice";

const BADGE = "/logo/logo%20cropped.png";
const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";

/**
 * The shop's logo, as the owner chose in Admin > Homepage > Page layout: the original badge picture, or a clean wordmark (the
 * mascot in a gold circle and "Spin Hobby" in the heading font), which stays sharp and readable at header size. Until the
 * settings arrive it shows the choice last seen on this device, so the logo doesn't swap on load.
 */
export function ShopLogo() {
  const config = useStoreConfig();
  const logo = config?.layout?.logo ?? readLogoChoice();
  if (logo !== "wordmark") return <img src={BADGE} alt="Spin Hobby" />;
  return (
    <span className="sh-wordmark">
      <span className="sh-wordmark__mark" aria-hidden>
        <img src={MASCOT} alt="" />
      </span>
      <span className="sh-wordmark__word">Spin Hobby</span>
    </span>
  );
}
