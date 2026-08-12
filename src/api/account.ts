import axios from "axios";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface IAccountAddress {
  id: number;
  kind: "shipping" | "billing";
  fname: string;
  lname: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export function getAddresses(): Promise<IAccountAddress[]> {
  return axios
    .get(`${serverUrl}api/account/addresses`, { withCredentials: true })
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Failed to load addresses");
      return response.data.addresses;
    });
}

export function addAddress(
  address: Omit<IAccountAddress, "id">
): Promise<IAccountAddress> {
  return axios
    .post(`${serverUrl}api/account/addresses`, address, { withCredentials: true })
    .then((response) => {
      if (!response.data.success) throw new Error(response.data.error || "Failed to save address");
      return response.data.address;
    });
}

export function deleteAddress(id: number): Promise<void> {
  return axios
    .delete(`${serverUrl}api/account/addresses/${id}`, { withCredentials: true })
    .then(() => undefined);
}
