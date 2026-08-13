import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearchSelector } from "../../../selectors";
import { getSearch, addItem } from "../../../reducers";
import { FeaturedMerch } from "../../components/Cards";
import { Ripple } from "../../components/Buttons";
import { IMerchPreview } from "../../../ts";
import { useWishlist } from "../../../hooks/useWishlist";

export default function Search() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchResult = useSearchSelector();
  const [isLoading, setIsLoading] = useState(true);

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "All Categories";
  const categoryIdsParam = searchParams.get("categoryIds") || "";
  const categoryName = searchParams.get("categoryName") || "";
  const categoryIds = categoryIdsParam ? categoryIdsParam.split(",").filter(Boolean) : [];

  useEffect(() => {
    if (query.trim().length > 0 || categoryIds.length > 0) {
      setIsLoading(true);
      dispatch(
        getSearch({
          page: 1,
          searchString: query,
          category: category,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        })
      );

      // Set loading to false after a short delay to allow Redux to update
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
    } else {
      // Nothing to search or browse by - redirect to home
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, query, category, categoryIdsParam, navigate]);

  const handleSuggestionClick = (suggestion: string) => {
    const params = new URLSearchParams({
      q: suggestion,
    });
    navigate(`/search?${params.toString()}`);
  };

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

  const handleQuickView = (product: IMerchPreview) => {
    console.log("Quick view:", product);
    // TODO: Implement quick view modal
  };

  const { isFavorited, toggleFavorite: handleToggleFavorite } = useWishlist();

  const popularSuggestions = [
    "Demon Slayer",
    "One Piece",
    "Naruto",
    "Attack on Titan",
    "Dragon Ball",
    "Nendoroid",
    "Scale Figure",
    "Plushie",
  ];

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-header-content">
          <div className="search-breadcrumb">
            <button onClick={() => navigate("/")} className="breadcrumb-btn">
              Home
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Search</span>
          </div>

          <div className="search-title">
            <span className="search-icon">🔍</span>
            <h1>Search Results</h1>
          </div>

          <div className="search-info">
            <div className="search-query">{query || categoryName}</div>
            {category !== "All Categories" && (
              <div className="search-category">{category}</div>
            )}
          </div>
        </div>
      </div>

      <div className="search-content">
        {isLoading ? (
          <div className="search-loading">
            <div className="loading-animation"></div>
            <div className="loading-text">Searching our collection...</div>
            <div className="loading-subtext">
              Finding the perfect anime collectibles for you
            </div>
          </div>
        ) : searchResult && searchResult.length > 0 ? (
          <>
            <div className="search-toolbar">
              <div className="search-results-count">
                <span className="results-icon">📊</span>
                Found{" "}
                <span className="count-number">{searchResult.length}</span>{" "}
                results
              </div>
              <div className="search-actions">
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

            <div className="search-merchs">
              {searchResult.map((result, index) => (
                <Ripple
                  key={result.id || index}
                  classes="search-ripple-featured-card"
                >
                  <FeaturedMerch
                    {...result}
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorited={isFavorited(result.id)}
                  />
                </Ripple>
              ))}
            </div>
          </>
        ) : (
          <div className="search-empty">
            <div className="empty-illustration">🔍</div>
            <h3>
              No results found{" "}
              {query ? `for "${query}"` : categoryName ? `in "${categoryName}"` : ""}
            </h3>
            <p>
              We couldn't find any anime collectibles matching your search. Try
              different keywords or browse our popular categories below.
            </p>

            <div className="empty-actions">
              <button onClick={() => navigate("/")} className="btn-primary">
                Browse All Products
              </button>
              <button
                onClick={() => navigate("/product?featured=true")}
                className="btn-secondary"
              >
                View Featured Items
              </button>
            </div>

            <div className="search-suggestions">
              <h4>Popular Searches</h4>
              <div className="suggestion-tags">
                {popularSuggestions.map((suggestion, index) => (
                  <span
                    key={index}
                    className="suggestion-tag"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
