import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { FeaturedMerch } from "../../components/Cards";
import { Ripple } from "../../components/Buttons";
import { IMerchPreview } from "../../../ts";
import { addItem } from "../../../reducers";
import { getCatalog } from "../../../api/square";

interface ProductsPageProps {}

export default function Product() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [products, setProducts] = useState<IMerchPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const category = searchParams.get("category") || "";
  const featured = searchParams.get("featured") === "true";
  const preorder = searchParams.get("preorder") === "true";
  const newArrivals = searchParams.get("new") === "true";

  useEffect(() => {
    fetchProducts();
  }, [searchParams, currentPage]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { items } = await getCatalog(undefined, undefined, 60);
      setProducts(items);
      setTotalPages(1);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPageTitle = () => {
    if (category) return `${category} Products`;
    if (featured) return "Featured Products";
    if (preorder) return "Pre-order Items";
    if (newArrivals) return "New Arrivals";
    return "All Products";
  };

  const getPageDescription = () => {
    if (category)
      return `Browse our collection of ${category.toLowerCase()} items`;
    if (featured) return "Discover our most popular and recommended items";
    if (preorder) return "Pre-order upcoming releases and exclusive items";
    if (newArrivals) return "Check out our latest additions to the collection";
    return "Browse our complete collection of anime figures, collectibles, and merchandise";
  };

  const getPageIcon = () => {
    if (category) return "📂";
    if (featured) return "⭐";
    if (preorder) return "🎯";
    if (newArrivals) return "🆕";
    return "📦";
  };

  const getPageStats = () => {
    const stats = [];
    if (products.length > 0) {
      stats.push({ icon: "📊", text: `${products.length} Products` });
    }
    if (featured) {
      stats.push({ icon: "⭐", text: "Hand-picked" });
    }
    if (preorder) {
      stats.push({ icon: "⏰", text: "Pre-order Available" });
    }
    if (newArrivals) {
      stats.push({ icon: "🔥", text: "Fresh Arrivals" });
    }
    return stats;
  };

  const handleAddToCart = (product: IMerchPreview) => {
    if (!product.id) return;
    dispatch(
      addItem({
        id: product.id,
        name: product.title,
        price: product.price,
        imageUrl: product.img,
      })
    );
  };

  const handleQuickView = (product: IMerchPreview) => {
    console.log("Quick view:", product);
    // TODO: Implement quick view modal
  };

  const handleToggleFavorite = (product: IMerchPreview) => {
    console.log("Toggle favorite:", product);
    // TODO: Implement favorites functionality
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${i === currentPage ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        {pages}
        <button
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <div className="products-header-content">
          <div className="products-breadcrumb">
            <button onClick={() => navigate("/")} className="breadcrumb-btn">
              Home
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Products</span>
          </div>

          <div className="products-title">
            <span className="products-icon">{getPageIcon()}</span>
            <h1>{getPageTitle()}</h1>
          </div>

          <p className="products-description">{getPageDescription()}</p>

          <div className="products-stats">
            {getPageStats().map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-text">{stat.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="products-content">
        {isLoading ? (
          <div className="products-loading">
            <div className="loading-animation"></div>
            <div className="loading-text">Loading products...</div>
            <div className="loading-subtext">
              Discovering amazing anime collectibles for you
            </div>
          </div>
        ) : error ? (
          <div className="products-error">
            <div className="error-illustration">⚠️</div>
            <h3>Error Loading Products</h3>
            <p>{error}</p>
            <button onClick={fetchProducts} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="products-toolbar">
              <div className="products-count">
                <span className="count-icon">📦</span>
                Showing <span className="count-number">
                  {products.length}
                </span>{" "}
                products
              </div>
              <div className="products-actions">
                <select className="filter-dropdown">
                  <option>All Categories</option>
                  <option>Figures</option>
                  <option>Nendoroids</option>
                  <option>Accessories</option>
                </select>
                <select className="sort-dropdown">
                  <option>Sort by Relevance</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest First</option>
                  <option>Most Popular</option>
                </select>
                <div className="view-toggle">
                  <button className="active">Grid</button>
                  <button>List</button>
                </div>
              </div>
            </div>

            <div className="products-grid">
              {products.map((product, index) => (
                <Ripple key={product.id || index} classes="product-card-ripple">
                  <FeaturedMerch
                    {...product}
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </Ripple>
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <div className="products-empty">
            <div className="empty-illustration">📦</div>
            <h3>No Products Found</h3>
            <p>We couldn't find any products matching your criteria.</p>
            <button onClick={() => navigate("/")} className="btn-primary">
              Browse All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
