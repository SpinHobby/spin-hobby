import axios from "axios";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface IOrderAddress {
  fname: string;
  lname: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface IOrderItem {
  squareItemId: string;
  squareVariationId: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
}

export interface IOrder {
  id: number;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  billingEmail: string;
  billingAddress: IOrderAddress;
  shippingAddress: IOrderAddress;
  items: IOrderItem[];
}

export function getOrders(): Promise<IOrder[]> {
  return axios.get(`${serverUrl}api/orders`, { withCredentials: true }).then((response) => {
    if (!response.data.success) throw new Error(response.data.error || "Failed to load orders");
    return response.data.orders;
  });
}

export function getOrder(id: number): Promise<IOrder> {
  return axios.get(`${serverUrl}api/orders/${id}`, { withCredentials: true }).then((response) => {
    if (!response.data.success) throw new Error(response.data.error || "Failed to load order");
    return response.data.order;
  });
}

export function lookupGuestOrder(paymentId: string, email: string): Promise<IOrder> {
  return axios
    .get(`${serverUrl}api/orders/lookup`, { params: { paymentId, email } })
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Order not found");
      return response.data.order;
    });
}
