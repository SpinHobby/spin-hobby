import axios from "axios";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spinhobby.herokuapp.com/"
    : "http://localhost:8001/";

export function identifyPhoto(
  photo: File
): Promise<{ title: string; description: string }> {
  const formData = new FormData();
  formData.append("photo", photo);

  return axios
    .post(`${serverUrl}api/cashier/identify`, formData)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Could not identify item");
      }
      return { title: response.data.title, description: response.data.description };
    });
}

export function recordItem(params: {
  title: string;
  description: string;
  price: number; // dollars
}): Promise<{ itemId?: string }> {
  return axios
    .post(`${serverUrl}api/cashier/record`, params)
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Could not save item to Square");
      }
      return { itemId: response.data.itemId };
    });
}
