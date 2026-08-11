import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { FeaturedMerch } from "../../components/Cards";
import { Ripple } from "../../components/Buttons";
import Header, { ISlide } from "./Header";
import { addItem } from "../../../reducers";
import { getCatalog, getInventoryCounts } from "../../../api/square";
import { getHomepageContent, IHeroSlideContent } from "../../../api/homepage";
import { IMerchPreview, IGroupedMerchPreview, ICategory } from "../../../ts";

// Placeholder announcement/promo slides. Swap for real admin-managed content later.
const PLACEHOLDER_SLIDES: Omit<ISlide, "img">[] = [
  {
    headline: "New Arrivals Every Week",
    subheading: "Fresh figures, badges, and plushies added regularly",
  },
  {
    headline: "Free Shipping on Orders $75+",
    subheading: "Shop your favorite series and save on shipping",
  },
  {
    headline: "Join Our Discord Community",
    subheading: "Get restock alerts and exclusive drops first",
  },
];

// Kept for the (currently unused) RTK-Query scaffolding in store/api/homeApi.ts.
export interface IHomeData {
  header: ISlide[];
  featured: IMerchPreview[];
  merchs: IGroupedMerchPreview[];
  categories: ICategory[];
}

function LoadingSpinner() {
  return (
    <div className="home-loading">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading amazing anime merchandise...</p>
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: any }) {
  return (
    <div className="home-error">
      <div className="error-message">
        <h3>Oops! Something went wrong</h3>
        <p>
          We couldn't load the catalog. Please try refreshing the page.
        </p>
        <details>
          <summary>Error details</summary>
          <pre>{JSON.stringify(error?.message || error, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

export default function Home() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<IMerchPreview[] | null>(null);
  const [adminSlides, setAdminSlides] = useState<IHeroSlideContent[]>([]);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    getHomepageContent()
      .then(async ({ slides, featuredProducts }) => {
        setAdminSlides(slides);

        // Bootstrap fallback: no featured products curated yet in the admin
        // panel, so show the general catalog instead of an empty homepage.
        let items = featuredProducts;
        if (items.length === 0) {
          const catalog = await getCatalog(undefined, undefined, 60);
          items = catalog.items;
        }
        setProducts(items);

        const variationIds = items
          .map((item) => item.variationId)
          .filter((id): id is string => !!id);
        getInventoryCounts(variationIds)
          .then((counts) => {
            setProducts((current) =>
              (current || []).map((item) =>
                item.variationId && item.variationId in counts
                  ? { ...item, stockCount: counts[item.variationId] }
                  : item
              )
            );
          })
          .catch((err) => console.error("Error loading inventory counts:", err));
      })
      .catch((err) => {
        console.log("Error loading homepage content: ", err);
        setError(err);
      });
  }, []);

  const handleAddToCart = (product: IMerchPreview) => {
    if (!product.id || !product.variationId) return;
    dispatch(
      addItem({
        id: product.id,
        variationId: product.variationId,
        name: product.title,
        price: product.price,
        imageUrl: product.img,
      })
    );
  };

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!products) {
    return <LoadingSpinner />;
  }

  // Bootstrap fallback: no slides configured in the admin panel yet.
  const slides: ISlide[] =
    adminSlides.length > 0
      ? adminSlides
          .map((slide, i) => ({
            headline: slide.headline,
            subheading: slide.subheading || undefined,
            img: slide.imageUrl || products[i]?.img || "",
          }))
          .filter((slide) => slide.img)
      : PLACEHOLDER_SLIDES.map((slide, i) => ({
          ...slide,
          img: products[i]?.img || "",
        })).filter((slide) => slide.img);

  return (
    <div className="products-page">
      {slides.length > 0 && <Header slides={slides} />}

      <div className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <span>Secure checkout via Square</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✅</span>
          <span>100% authentic merchandise</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">📦</span>
          <span>Ships within 2-3 business days</span>
        </div>
      </div>

      <div className="products-content">
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map((product, index) => (
              <Ripple key={product.id || index} classes="product-card-ripple">
                <FeaturedMerch {...product} onAddToCart={handleAddToCart} />
              </Ripple>
            ))}
          </div>
        ) : (
          <div className="products-empty">
            <div className="empty-illustration">📦</div>
            <h3>No Products Yet</h3>
            <p>Check back soon for new arrivals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
