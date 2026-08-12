import { createAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ILogin, ISquareLogin, IAuthUser } from "../ts";

export interface IUserState {
  beta: boolean;
  awaitingLoginRes: boolean;
  isAuthenticated: boolean;
  user: IAuthUser | null;
  token: string | null;
}

const initialState: IUserState = {
  beta: true,
  awaitingLoginRes: false,
  isAuthenticated: false,
  user: null,
  token: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<ILogin>) => {
      // Standard email/password login
      state.awaitingLoginRes = false;
      // Additional login logic will be handled in saga
    },
    loginSquare: (state, action: PayloadAction<ISquareLogin>) => {
      const { user, token } = action.payload;
      state.isAuthenticated = true;
      state.user = {
        id: user.id,
        merchantId: user.merchantId,
        businessName: user.businessName,
        authType: "square",
        loginAt: new Date().toISOString(),
      };
      state.token = token;
      state.awaitingLoginRes = false;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{ user: IAuthUser; token: string }>
    ) => {
      const { user, token } = action.payload;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.awaitingLoginRes = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.awaitingLoginRes = false;
    },
    setUser: (state, action: PayloadAction<IUserState>) => {
      return { ...state, ...action.payload };
    },
    loginBeta: (state) => {
      state.beta = true;
    },
    logoutBeta: (state) => {
      state.beta = false;
    },
    queueLogin: (state) => {
      state.awaitingLoginRes = true;
    },
    clearQueueLogin: (state) => {
      state.awaitingLoginRes = false;
    },
    initializeAuth: (
      state,
      action: PayloadAction<{ user: IAuthUser; token: string } | null>
    ) => {
      if (action.payload) {
        const { user, token } = action.payload;
        state.isAuthenticated = true;
        state.user = user;
        state.token = token;
      } else {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      }
    },
  },
});

export const requestLoginBeta = createAction<ILogin>("user/requestLoginBeta");

export const requestOAuthLogin = createAction<{
  provider: "google" | "discord";
  idToken?: string; // google
  code?: string; // discord
  redirectUri?: string; // discord
}>("user/requestOAuthLogin");

export const requestLogout = createAction("user/requestLogout");

export const {
  login,
  loginSquare,
  loginSuccess,
  logout,
  setUser,
  loginBeta,
  logoutBeta,
  queueLogin,
  clearQueueLogin,
  initializeAuth,
} = userSlice.actions;

export default userSlice.reducer;
