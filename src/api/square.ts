import axios from "axios";
import { IMerchPreview } from "../ts";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spinhobby.herokuapp.com/"
    : "http://localhost:8001/";

// Inline SVG so it never depends on an external image service being reachable.
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#e5e5e5"/><text x="200" y="200" font-family="sans-serif" font-size="24" fill="#adadad" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>`
  );

export interface ISquareConfig {
  applicationId: string;
  locationId: string;
}

export function getSquareConfig(): Promise<ISquareConfig> {
  return axios
    .get(`${serverUrl}api/square/config`)
    .then((response) => response.data);
}

export function getCategories(): Promise<{ id: string; name: string }[]> {
  return axios.get(`${serverUrl}api/square/categories`).then((response) =>
    (response.data.categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.categoryData?.name || "",
    }))
  );
}

export function getCatalog(
  q?: string,
  cursor?: string,
  limit = 24
): Promise<{ items: IMerchPreview[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (cursor) params.append("cursor", cursor);
  params.append("limit", String(limit));

  return axios
    .get(`${serverUrl}api/square/catalog?${params.toString()}`)
    .then((response) => {
      const imagesById = buildImageMap(response.data.relatedObjects || []);
      return {
        items: (response.data.items || []).map((item: any) =>
          mapCatalogItemToMerchPreview(item, imagesById)
        ),
        cursor: response.data.cursor,
      };
    });
}

export function getCatalogItem(
  id: string
): Promise<IMerchPreview | null> {
  return axios
    .get(`${serverUrl}api/square/catalog/${id}`)
    .then((response) => {
      if (!response.data.success) return null;
      const imagesById = buildImageMap(response.data.relatedObjects || []);
      return mapCatalogItemToMerchPreview(response.data.item, imagesById);
    });
}

function buildImageMap(relatedObjects: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const obj of relatedObjects) {
    if (obj.type === "IMAGE" && obj.imageData?.url) {
      map.set(obj.id, obj.imageData.url);
    }
  }
  return map;
}

export function createPayment(params: {
  sourceId: string;
  amount: number; // smallest currency unit, e.g. cents
  currency?: string;
}): Promise<{ id: string; status: string; receiptUrl?: string }> {
  return axios
    .post(`${serverUrl}api/square/payments`, params)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Payment failed");
      }
      return response.data.payment;
    });
}

// Maps a raw Square CatalogObject (type ITEM) into the shape used across the UI.
export function mapCatalogItemToMerchPreview(
  item: any,
  imagesById?: Map<string, string>
): IMerchPreview {
  const itemData = item.itemData || {};
  const variation = itemData.variations?.[0]?.itemVariationData;
  const priceCents = variation?.priceMoney?.amount || 0;

  const imageIds: string[] = itemData.imageIds || itemData.image_ids || [];
  const images = imageIds
    .map((id) => imagesById?.get(id))
    .filter((url): url is string => !!url);
  if (images.length === 0) images.push(PLACEHOLDER_IMAGE);

  return {
    id: item.id,
    title: itemData.name || "Untitled Product",
    name: itemData.name || "Untitled Product",
    img: images[0],
    images,
    description: itemData.description || itemData.descriptionPlaintext || "",
    price: priceCents / 100,
  };
}
