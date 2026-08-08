import axios from "axios";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface SquareAuthResponse {
  success: boolean;
  data?: {
    token: string;
    merchant: {
      id: string;
      merchantId: string;
      businessName: string;
      status: string;
    };
    expiresAt: string;
  };
  error?: string;
}

export interface SquareOAuthUrlResponse {
  success: boolean;
  data?: {
    authorizationUrl: string;
    redirectUri: string;
    state: string;
  };
  error?: string;
}

/**
 * Square Authentication API Service
 */
export class SquareAuthService {
  private static readonly STORAGE_KEY = "spinHobby_token";
  private static readonly USER_KEY = "spinHobby_user";
  private static readonly SQUARE_STATE_KEY = "square_oauth_state";

  /**
   * Get Square OAuth authorization URL
   */
  static async getSquareAuthUrl(): Promise<SquareOAuthUrlResponse> {
    try {
      const state = this.generateState();
      const redirectUri = `${window.location.origin}/auth/square/callback`;

      const response = await axios.get(`${serverUrl}api/v1/square/auth/url`, {
        params: {
          state,
          redirect_uri: redirectUri,
        },
      });

      if (response.data.success) {
        // Store state for verification
        localStorage.setItem(this.SQUARE_STATE_KEY, state);
        return response.data;
      } else {
        throw new Error(response.data.error || "Failed to get auth URL");
      }
    } catch (error: any) {
      console.error("Error getting Square auth URL:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Failed to get authorization URL",
      };
    }
  }

  /**
   * Handle Square OAuth callback
   */
  static async handleSquareCallback(
    code: string,
    state: string
  ): Promise<SquareAuthResponse> {
    try {
      // Verify state
      const storedState = localStorage.getItem(this.SQUARE_STATE_KEY);
      if (state !== storedState) {
        throw new Error("Invalid state parameter. Possible CSRF attack.");
      }

      const redirectUri = `${window.location.origin}/auth/square/callback`;

      const response = await axios.post(
        `${serverUrl}api/v1/square/auth/callback`,
        {
          code,
          state,
          redirect_uri: redirectUri,
        }
      );

      if (response.data.success) {
        // Store JWT token and user info
        const { token, merchant } = response.data.data;
        this.storeAuthData(token, merchant);

        // Clean up state
        localStorage.removeItem(this.SQUARE_STATE_KEY);

        return response.data;
      } else {
        throw new Error(response.data.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Error handling Square callback:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Authentication failed",
      };
    }
  }

  /**
   * Initiate Square login process
   */
  static async initiateSquareLogin(): Promise<void> {
    try {
      const authUrlResponse = await this.getSquareAuthUrl();

      if (authUrlResponse.success && authUrlResponse.data) {
        // Redirect to Square OAuth
        window.location.href = authUrlResponse.data.authorizationUrl;
      } else {
        throw new Error(authUrlResponse.error || "Failed to initiate login");
      }
    } catch (error: any) {
      console.error("Error initiating Square login:", error);
      throw error;
    }
  }

  /**
   * Store authentication data
   */
  private static storeAuthData(token: string, merchant: any): void {
    localStorage.setItem(this.STORAGE_KEY, token);
    localStorage.setItem(
      this.USER_KEY,
      JSON.stringify({
        type: "square",
        merchant,
        loginAt: new Date().toISOString(),
      })
    );

    // Set default axios header
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Get stored JWT token
   */
  static getToken(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Get stored user data
   */
  static getUser(): any | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Logout user
   */
  static logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SQUARE_STATE_KEY);
    delete axios.defaults.headers.common["Authorization"];
  }

  /**
   * Verify token validity
   */
  static async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await axios.get(
        `${serverUrl}api/v1/square/auth/verify`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.success;
    } catch (error) {
      console.error("Token verification failed:", error);
      this.logout(); // Clean up invalid token
      return false;
    }
  }

  /**
   * Generate random state for OAuth
   */
  private static generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Refresh JWT token if needed
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      // Decode JWT to check expiration (simple check)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;

      // If token expires in less than 5 minutes, try to refresh
      if (payload.exp - currentTime < 300) {
        const response = await axios.post(
          `${serverUrl}api/v1/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success && response.data.data.token) {
          const newToken = response.data.data.token;
          localStorage.setItem(this.STORAGE_KEY, newToken);
          axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          return true;
        }
      }

      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }
}

export default SquareAuthService;
