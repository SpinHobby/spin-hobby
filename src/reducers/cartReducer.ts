import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ICartItem } from "../ts";

export interface ICartState {
  items: ICartItem[];
  error: string;
}

export const CART_STORAGE_KEY = "spinhobby_cart";

function loadCartFromStorage(): ICartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const initialState: ICartState = {
  items: loadCartFromStorage(),
  error: "",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (
      state,
      action: PayloadAction<Omit<ICartItem, "quantity"> & { quantity?: number }>
    ) => {
      const existing = state.items.find((i) => i.id === action.payload.id);
      const delta = action.payload.quantity || 1;
      if (existing) {
        existing.quantity += delta;
      } else {
        state.items.push({ ...action.payload, quantity: delta });
      }
    },
    setQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
        return;
      }
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { addItem, setQuantity, removeItem, clearCart, setError } =
  cartSlice.actions;

export default cartSlice.reducer;
