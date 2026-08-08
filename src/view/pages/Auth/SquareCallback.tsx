import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SquareAuthService from "../../../api/squareAuth";
import { useDispatch } from "react-redux";
import { loginSquare, clearQueueLogin } from "../../../reducers/userReducer";
import { hideModal } from "../../../reducers/modalReducer";

export default function SquareCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        throw new Error(`Square OAuth error: ${errorParam}`);
      }

      if (!code || !state) {
        throw new Error("Missing authorization code or state parameter");
      }

      setStatus("loading");

      // Handle the Square OAuth callback
      const result = await SquareAuthService.handleSquareCallback(code, state);

      if (result.success && result.data) {
        // Update Redux state
        dispatch(
          loginSquare({
            type: "square",
            user: result.data.merchant,
            token: result.data.token,
          })
        );

        dispatch(clearQueueLogin());
        dispatch(hideModal());

        setStatus("success");

        // Redirect to home or previous page after short delay
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Square callback error:", error);
      setError(error.message);
      setStatus("error");

      // Redirect to home after showing error
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 5000);
    }
  }

  return (
    <div className="square-callback-container">
      <div className="square-callback-content">
        {status === "loading" && (
          <div className="callback-loading">
            <div className="callback-spinner"></div>
            <h2>Connecting to Square...</h2>
            <p>Please wait while we complete your authentication.</p>
          </div>
        )}

        {status === "success" && (
          <div className="callback-success">
            <div className="callback-success-icon">✅</div>
            <h2>Authentication Successful!</h2>
            <p>Welcome to Spin Hobby! You're now connected with Square.</p>
            <p>Redirecting you back to the store...</p>
          </div>
        )}

        {status === "error" && (
          <div className="callback-error">
            <div className="callback-error-icon">❌</div>
            <h2>Authentication Failed</h2>
            <p>{error}</p>
            <p>You'll be redirected back to the store in a few seconds.</p>
            <button
              className="callback-retry-btn"
              onClick={() => navigate("/", { replace: true })}
            >
              Return to Store
            </button>
          </div>
        )}
      </div>

      <style>{`
        .square-callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .square-callback-content {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .callback-loading,
        .callback-success,
        .callback-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .callback-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .callback-success-icon,
        .callback-error-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        h2 {
          color: #333;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        p {
          color: #666;
          margin: 8px 0;
          line-height: 1.5;
        }

        .callback-retry-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 16px;
          transition: background-color 0.2s;
        }

        .callback-retry-btn:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
}
