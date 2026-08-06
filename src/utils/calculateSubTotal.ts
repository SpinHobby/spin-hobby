import { ICartItem } from "../ts";

export default function calculateSubTotal(cart: {
  items: ICartItem[];
}): number {
  return cart.items.reduce((subtotal, item) => {
    return subtotal + item.price * item.quantity;
  }, 0);
}
