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

export function identifyPhoto(
  photo: File
): Promise<{ title: string; description: string; category: string }> {
  const formData = new FormData();
  formData.append("photo", photo);

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

  return axios
    .post(`${serverUrl}api/cashier/record`, formData)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Could not save item to Square");
      }
      return { itemId: response.data.itemId };
    });
}
