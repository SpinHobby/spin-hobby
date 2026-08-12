import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

// Base API configuration
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: serverUrl,
    // Customer auth rides an httpOnly session cookie (credentials: "include"
    // so it's sent cross-origin); the merchant/admin flow still uses its own
    // Bearer token below - the two are separate trust domains that coexist.
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("spinHobby_token");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Home", "Product", "Category", "Series", "Character", "Orders", "Wishlist"],
  endpoints: () => ({}),
});

export default baseApi;
