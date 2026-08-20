import React from "react";
import { IconType } from "react-icons";
import { FaInstagram, FaDiscord } from "react-icons/fa";
import { RiShoppingCart2Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import { useCartSelector } from "../../../selectors";
import UserMenu from "./UserMenu";

interface INavBarCommand {
  label: string;
  icon: IconType;
  onClick: () => void;
  badge?: number;
  className?: string;
}

export default function Commands() {
  const navigate = useNavigate();
  const cart = useCartSelector();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const navigateToCart = () => {
    navigate("/cart");
  };
  const navigateToInstagram = () => {
    window.open(
      "https://www.instagram.com/spinhobby",
      "_blank",
      "noopener,noreferrer"
    );
  };
  const navigateToDiscord = () => {
    window.open("https://discord.gg/8RM9qPznR", "_blank", "noopener,noreferrer");
  };

  const commands: INavBarCommand[] = [
    {
      label: "Cart",
      icon: RiShoppingCart2Line,
      onClick: navigateToCart,
      badge: cartCount,
    },
    {
      label: "Discord",
      icon: FaDiscord,
      onClick: navigateToDiscord,
      className: "navbar-command-discord",
    },
    {
      label: "Instagram",
      icon: FaInstagram,
      onClick: navigateToInstagram,
      className: "navbar-command-instagram",
    },
  ];

  function getCommandButtons(commands: INavBarCommand[]) {
    return commands.map((command, index) => (
      <div
        key={`navbar-command-${index}-${command.label}`}
        className={classNames("navbar-command", command.className)}
        onClick={command.onClick}
      >
        <span className="navbar-command-icon-wrap">
          <command.icon className="navbar-command-icon" size={"1.5em"} />
          {!!command.badge && (
            <span className="navbar-command-badge">{command.badge}</span>
          )}
        </span>
        <label>{command.label}</label>
      </div>
    ));
  }

  return (
    <div className="navbar-commands">
      <UserMenu />
      {getCommandButtons(commands)}
    </div>
  );
}
