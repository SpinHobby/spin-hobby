import axios from "axios";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

// Mirrors PRODUCT_CATEGORIES in the backend's src/services/productCategories.ts.
export const PRODUCT_CATEGORIES = [
  "Bishoujo Figures",
  "Action Figures",
  "Nendoroids & Chibi Figures",
  "Plushies",
  "Keychains & Straps",
  "Acrylic Stands",
  "Badges & Pins",
  "Trading Cards & TCG",
  "Apparel",
  "Home Goods",
  "Posters & Tapestries",
  "Stationery & Stickers",
  "Cosplay",
  "Other",
] as const;

export interface IArtworkCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
}

export function identifyPhoto(
  photo: File,
  condition?: "sealed" | "used"
): Promise<{
  title: string;
  description: string;
  category: string;
  artworkCrop?: IArtworkCrop;
}> {
  const formData = new FormData();
  formData.append("photo", photo);
  if (condition) formData.append("condition", condition);

  return axios
    .post(`${serverUrl}api/cashier/identify`, formData)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Could not identify item");
      }
      return {
        title: response.data.title,
        description: response.data.description,
        category: response.data.category,
        artworkCrop: response.data.artworkCrop,
      };
    });
}

export function recordItem(params: {
  photo?: File;
  title: string;
  description: string;
  price: number; // dollars
  hidden: boolean;
  quantity?: number; // only used when hidden is false
  category?: string;
  condition?: "sealed" | "used";
  artworkCrop?: IArtworkCrop;
}): Promise<{ itemId?: string }> {
  const formData = new FormData();
  if (params.photo) formData.append("photo", params.photo);
  formData.append("title", params.title);
  formData.append("description", params.description);
  formData.append("price", String(params.price));
  formData.append("hidden", String(params.hidden));
  if (!params.hidden && params.quantity != null) {
    formData.append("quantity", String(params.quantity));
  }
  if (params.category) formData.append("category", params.category);
  if (params.condition) formData.append("condition", params.condition);
  if (params.artworkCrop) {
    formData.append("artworkCropX", String(params.artworkCrop.x));
    formData.append("artworkCropY", String(params.artworkCrop.y));
    formData.append("artworkCropWidth", String(params.artworkCrop.width));
    formData.append("artworkCropHeight", String(params.artworkCrop.height));
    formData.append("artworkRotationDegrees", String(params.artworkCrop.rotationDegrees));
  }

  return axios
    .post(`${serverUrl}api/cashier/record`, formData)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Could not save item to Square");
      }
      return { itemId: response.data.itemId };
    });
}

export interface ISearchResultItem {
  id: string;
  name: string;
  priceCents: number;
  hidden: boolean;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  stockCount: number | null; // null = untracked in Square (unlimited)
}

export function searchItemsForEdit(query: string): Promise<ISearchResultItem[]> {
  return axios
    .get(`${serverUrl}api/cashier/search`, { params: { q: query } })
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Search failed");
      }
      return response.data.items;
    });
}

// Paginated variant for the admin "browse all items" view - a blank query
// returns the full catalog page by page instead of requiring a search term.
export function browseItems(params: {
  q?: string;
  cursor?: string;
}): Promise<{ items: ISearchResultItem[]; cursor?: string }> {
  return axios
    .get(`${serverUrl}api/cashier/search`, {
      params: { q: params.q || undefined, cursor: params.cursor || undefined },
    })
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Search failed");
      }
      return { items: response.data.items, cursor: response.data.cursor };
    });
}

export interface IEditableItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  variationId?: string;
  categoryId?: string;
  categoryName?: string;
  hidden: boolean;
  stockCount: number | null;
}

export function getItemForEdit(id: string): Promise<IEditableItem> {
  return axios.get(`${serverUrl}api/cashier/item/${id}`).then((response) => {
    if (!response.data.success) {
      throw new Error(response.data.error || "Could not load item");
    }
    return response.data.item;
  });
}

export function updateItem(
  id: string,
  params: {
    photo?: File;
    title: string;
    description: string;
    price: number; // dollars
    hidden: boolean;
    quantity?: number;
    category?: string;
    categoryId?: string; // fallback when category isn't one of our canonical names
  }
): Promise<{ itemId?: string }> {
  const formData = new FormData();
  if (params.photo) formData.append("photo", params.photo);
  formData.append("title", params.title);
  formData.append("description", params.description);
  formData.append("price", String(params.price));
  formData.append("hidden", String(params.hidden));
  if (!params.hidden && params.quantity != null) {
    formData.append("quantity", String(params.quantity));
  }
  if (!params.category && params.categoryId) {
    formData.append("categoryId", params.categoryId);
  }
  if (params.category) formData.append("category", params.category);

  return axios.put(`${serverUrl}api/cashier/item/${id}`, formData).then((response) => {
    if (!response.data.success) {
      throw new Error(response.data.error || "Could not update item");
    }
    return { itemId: response.data.itemId };
  });
}
