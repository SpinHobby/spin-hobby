import { Pagination, Button } from "@/components";
import { useState } from "react";
import "./wishlist.scss";

export function Wishlist() {
  const [page, setPage] = useState(1);
  const PAGE = 5;

  return (
    <>
      <div className="sf-hero__banner">
        <div className="sf-hero__copy">
          <h1 className="sf-hero__eyebrow">SAVED FOR YOU</h1>
          <h2 className="">[total] items you love, waiting for you</h2>
          <p>Wishlist total: [PRICE]</p>
        </div>
        <Button type="button" className="sf-cart-btn" variant="gold">
          Add all to cart
        </Button>
      </div>
      <Pagination page={page} pageSize={PAGE} total={3} onPage={(newPage) => setPage(newPage)} />
      <div className="wishlist-product">
        <div className="ad-chips" role="group" aria-label="Filter by status">
          <button type="button" className="sh-chip">
            All · [counts]
          </button>
          <button type="button" className="sh-chip">
            Price drops · [counts]
          </button>
          <button type="button" className="sh-chip">
            Low stock · [counts]
          </button>
        </div>
        <div className="wishlist-views">
          <Button type="button" className="sh-chip views-grid"></Button>
          <Button type="button" className="sh-chip views-row"></Button>
        </div>
      </div>
    </>
  );
}
