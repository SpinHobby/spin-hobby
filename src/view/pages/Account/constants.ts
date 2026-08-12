import { BiLogOut } from "react-icons/bi";
import { GrLocation } from "react-icons/gr";
import { AiOutlineBars } from "react-icons/ai";
import { RiBookletLine } from "react-icons/ri";
import { BiLink } from "react-icons/bi";
import { Content, MenuItem } from "./types";

export const menuItems: MenuItem[] = [
  {
    content: Content.Summary,
    label: "Summary",
    icon: AiOutlineBars,
  },
  {
    content: Content.OrderHistory,
    label: "Order History",
    icon: RiBookletLine,
  },
  {
    content: Content.Address,
    label: "Address",
    icon: GrLocation,
  },
  {
    content: Content.LinkedAccounts,
    label: "Linked Accounts",
    icon: BiLink,
  },
  {
    content: Content.LogOut,
    label: "Log Out",
    icon: BiLogOut,
  },
];
