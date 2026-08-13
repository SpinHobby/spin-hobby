import axios from "axios";
import { IMerchPreview } from "../ts";
import { buildImageMap, mapCatalogItemToMerchPreview } from "./square";
import { adminAuthHeaders } from "./adminAuth";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface IHeroSlideContent {
  id: number;
  headline: string;
  subheading: string | null;
  imageUrl: string | null;
}

export function getHomepageContent(): Promise<{
  slides: IHeroSlideContent[];
  featuredProducts: IMerchPreview[];
}> {
  return axios.get(`${serverUrl}api/homepage`).then((response) => {
    const imagesById = buildImageMap(response.data.relatedObjects || []);
    return {
      slides: response.data.slides || [],
      featuredProducts: (response.data.featuredItems || []).map((item: any) =>
        mapCatalogItemToMerchPreview(item, imagesById)
      ),
    };
  });
}

// --- Admin: hero slides ---

export interface IAdminSlide {
  id: number;
  headline: string;
  subheading: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

export function getAdminSlides(): Promise<IAdminSlide[]> {
  return axios
    .get(`${serverUrl}api/homepage/admin/slides`, { headers: adminAuthHeaders() })
    .then((response) => response.data.slides || []);
}

export function createSlide(params: {
  headline: string;
  subheading?: string;
  imageUrl?: string;
  sortOrder?: number;
}): Promise<IAdminSlide> {
  return axios
    .post(`${serverUrl}api/homepage/admin/slides`, params, { headers: adminAuthHeaders() })
    .then((response) => response.data.slide);
}

export function updateSlide(
  id: number,
  params: Partial<{
    headline: string;
    subheading: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isVisible: boolean;
  }>
): Promise<IAdminSlide> {
  return axios
    .put(`${serverUrl}api/homepage/admin/slides/${id}`, params, { headers: adminAuthHeaders() })
    .then((response) => response.data.slide);
}

export function deleteSlide(id: number): Promise<void> {
  return axios
    .delete(`${serverUrl}api/homepage/admin/slides/${id}`, { headers: adminAuthHeaders() })
    .then(() => undefined);
}

// --- Admin: featured products ---

export interface IAdminFeaturedProduct {
  id: number;
  square_item_id: string;
  sort_order: number;
  is_visible: boolean;
  name: string;
}

export function getAdminFeaturedProducts(): Promise<IAdminFeaturedProduct[]> {
  return axios
    .get(`${serverUrl}api/homepage/admin/featured`, { headers: adminAuthHeaders() })
    .then((response) => response.data.featured || []);
}

export function addFeaturedProduct(
  squareItemId: string,
  sortOrder?: number
): Promise<IAdminFeaturedProduct> {
  return axios
    .post(
      `${serverUrl}api/homepage/admin/featured`,
      { squareItemId, sortOrder },
      { headers: adminAuthHeaders() }
    )
    .then((response) => response.data.featured);
}

export function updateFeaturedProduct(
  id: number,
  params: Partial<{ sortOrder: number; isVisible: boolean }>
): Promise<IAdminFeaturedProduct> {
  return axios
    .put(`${serverUrl}api/homepage/admin/featured/${id}`, params, {
      headers: adminAuthHeaders(),
    })
    .then((response) => response.data.featured);
}

export function removeFeaturedProduct(id: number): Promise<void> {
  return axios
    .delete(`${serverUrl}api/homepage/admin/featured/${id}`, { headers: adminAuthHeaders() })
    .then(() => undefined);
}
