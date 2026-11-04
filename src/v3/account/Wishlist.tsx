import { Pagination, Card, Button } from "@/components";
import { useState } from "react";

export function Wishlist() {
  const [page, setPage] = useState(1);
  const PAGE = 5;

  return (
    <>
      <Card title="" className="sf-hero" padded>
        <Button>Add all to cart</Button>
      </Card>
      <Pagination page={page} pageSize={PAGE} total={3} onPage={(newPage) => setPage(newPage)} />
    </>
  );
}
