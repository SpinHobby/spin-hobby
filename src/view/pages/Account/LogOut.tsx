import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { requestLogout } from "../../../reducers";

export function LogOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(requestLogout());
    navigate("/", { replace: true });
  }, [dispatch, navigate]);

  return <div id="account-logout">Signing out...</div>;
}
