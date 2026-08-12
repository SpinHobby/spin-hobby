export interface ILogin {
  username: string;
  password: string;
}

export interface ISquareLogin {
  type: "square";
  user: {
    id: string;
    merchantId: string;
    businessName: string;
    status: string;
  };
  token: string;
}

export interface IAuthUser {
  id?: string;
  email?: string;
  username?: string;
  merchantId?: string;
  businessName?: string;
  fname?: string;
  lname?: string;
  avatarUrl?: string;
  authType: "standard" | "square" | "google" | "discord";
  loginAt: string;
}

export interface ICartItem {
  id: string; // Square catalog object id
  variationId: string; // Square catalog item variation id, needed for inventory adjustments
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}
