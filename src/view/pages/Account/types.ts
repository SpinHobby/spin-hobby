import { IconType } from "react-icons";

export enum Content {
  Summary,
  OrderHistory,
  Address,
  LinkedAccounts,
  LogOut,
}

export interface MenuItem {
  content: Content;
  label: string;
  icon: IconType;
}
