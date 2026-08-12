import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { postDiscordLogin } from "../../../api/customerAuth";
import { loginSuccess, clearQueueLogin } from "../../../reducers/userReducer";
import { DISCORD_REDIRECT_URI } from "../../../ts/constants";

export default function DiscordCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      if (errorParam) throw new Error(`Discord sign-in was cancelled or denied`);
      if (!code) throw new Error("Missing authorization code");

      const user = await postDiscordLogin(code, DISCORD_REDIRECT_URI);
      dispatch(loginSuccess({ user, token: "" }));
      dispatch(clearQueueLogin());
      setStatus("success");

      const redirect = sessionStorage.getItem("post_login_redirect") || "/account";
      sessionStorage.removeItem("post_login_redirect");
      setTimeout(() => navigate(redirect, { replace: true }), 1000);
    } catch (err: any) {
      console.error("Discord callback error:", err);
      setError(err.message || "Sign-in failed");
      setStatus("error");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    }
  }

  return (
    <div className="cashier-page">
      <div className="cashier-container" style={{ textAlign: "center" }}>
        {status === "loading" && <p>Signing you in with Discord...</p>}
        {status === "success" && <p>Signed in! Redirecting...</p>}
        {status === "error" && <p className="cashier-error">{error}</p>}
      </div>
    </div>
  );
}
