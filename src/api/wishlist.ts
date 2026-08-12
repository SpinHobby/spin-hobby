import axios from "axios";
import { buildImageMap, mapCatalogItemToMerchPreview } from "./square";
import { IMerchPreview } from "../ts";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export function getWishlist(): Promise<IMerchPreview[]> {
  return axios
    .get(`${serverUrl}api/wishlist`, { withCredentials: true })
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Failed to load wishlist");
      const imagesById = buildImageMap(response.data.relatedObjects || []);
      return (response.data.items || []).map((item: any) =>
        mapCatalogItemToMerchPreview(item, imagesById)
      );
    });
}

export function addToWishlist(squareItemId: string): Promise<void> {
  return axios
    .post(`${serverUrl}api/wishlist`, { squareItemId }, { withCredentials: true })
    .then(() => undefined);
}

export function removeFromWishlist(squareItemId: string): Promise<void> {
  return axios
    .delete(`${serverUrl}api/wishlist/${squareItemId}`, { withCredentials: true })
    .then(() => undefined);
}
