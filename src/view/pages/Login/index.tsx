import React from "react";
import { useDispatch } from "react-redux";
import { Navigate, useSearchParams } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { requestOAuthLogin } from "../../../reducers";
import { useUserSelector } from "../../../selectors";
import { GOOGLE_CLIENT_ID, DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } from "../../../ts/constants";
import "./login.scss";

export default function Login() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, awaitingLoginRes } = useUserSelector();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  if (isAuthenticated && user?.authType !== "square") {
    return <Navigate to={redirect} replace />;
  }

  function handleDiscordLogin() {
    if (!DISCORD_CLIENT_ID) return;
    sessionStorage.setItem("post_login_redirect", redirect);
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify email",
    });
    window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Sign In</h1>
          <p>Track orders, save favorites, and check out faster.</p>
        </div>

        <div className="login-oauth-buttons">
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (!credentialResponse.credential) return;
                dispatch(
                  requestOAuthLogin({
                    provider: "google",
                    idToken: credentialResponse.credential,
                  })
                );
              }}
              onError={() => console.error("Google sign-in failed")}
              width="320"
            />
          </GoogleOAuthProvider>

          {DISCORD_CLIENT_ID && (
            <button className="login-discord-btn" onClick={handleDiscordLogin}>
              Sign in with Discord
            </button>
          )}

          {awaitingLoginRes && <p className="login-status">Signing in...</p>}
        </div>
      </div>
    </div>
  );
}
