import React, { FormEvent, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { logoutBeta, requestLoginBeta } from "../../../reducers";
import { useAwaitLoginSelector, useBetaSelector } from "../../../selectors";
import { ILogin } from "../../../ts";

const USERNAME = "username";
const PASSWORD = "password";

export default function Login() {
  const dispatch = useDispatch();
  const beta = useBetaSelector();
  const loggingIn = useAwaitLoginSelector();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [inputs, setInputs] = useState<ILogin>({
    username: "",
    password: "",
  });
  const [hasAttempted, setHasAttempted] = useState<boolean>(false);

  if (beta) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="beta-success">
            <h4>You are now logged in as beta user!</h4>
            <h5>The following pages are available for beta users</h5>
            <div className="beta-links">
              <Link to="/">🏠 spinhobby.com</Link>
              <Link to="/cart">🛒 spinhobby.com/cart</Link>
              <Link to="/checkout">💳 spinhobby.com/checkout</Link>
              <Link to="/search">🔍 spinhobby.com/search</Link>
              <Link to="/product">📦 spinhobby.com/product</Link>
              <Link to="/admin" className="admin-link">
                ⚙️ Admin Dashboard
              </Link>
            </div>
            <button
              className="logout-btn"
              onClick={() => dispatch(logoutBeta())}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Beta Access</h1>
          <p>Enter your credentials to access the beta version</p>
        </div>

        <div className="login-form">
          {loggingIn && <div className="loading-message">Logging in...</div>}

          {hasAttempted && !loggingIn && (
            <div className="error-message">
              Incorrect username and/or password
            </div>
          )}

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              dispatch(requestLoginBeta(inputs));
              setHasAttempted(true);
            }}
          >
            <div className="form-group">
              <label htmlFor={USERNAME}>Username</label>
              <input
                id={USERNAME}
                name={USERNAME}
                type="text"
                value={inputs.username}
                onChange={(e) =>
                  setInputs(({ password }) => ({
                    username: e.target.value,
                    password,
                  }))
                }
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={PASSWORD}>Password</label>
              <input
                id={PASSWORD}
                name={PASSWORD}
                type={showPassword ? "text" : "password"}
                value={inputs.password}
                onChange={(e) =>
                  setInputs(({ username }) => ({
                    username,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="checkbox-group">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <label htmlFor="show-password">Show password</label>
            </div>

            <button type="submit" className="submit-btn" disabled={loggingIn}>
              {loggingIn ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
