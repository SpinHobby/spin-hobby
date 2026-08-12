import { takeLatest, all, put, call } from "redux-saga/effects";
import {
  queueLogin,
  login,
  loginBeta,
  requestLoginBeta,
  requestOAuthLogin,
  requestLogout,
  setUser,
  clearQueueLogin,
  logoutBeta,
  loginSuccess,
  logout,
} from "../reducers";
import { authenticateBetaUser, requestLogin } from "../api";
import { postGoogleLogin, postDiscordLogin, postLogout } from "../api/customerAuth";
import { PayloadAction } from "@reduxjs/toolkit";
import { ILogin, IAuthUser } from "../ts";
import Cookies from "js-cookie";

function* loginSaga() {
  yield requestLogin({ username: "anelmes0", password: "spinhobby" }).then(
    (res) => {
      console.log("kooo", res);
      setUser(res.data);
    }
  );
}

function* requestLoginBetaSaga({ payload }: PayloadAction<ILogin>) {
  yield put({ type: queueLogin.type });
  const res: string = yield authenticateBetaUser(payload);
  if (res === "SUCCESS") yield put({ type: loginBeta.type });
  yield put({ type: clearQueueLogin.type });
}

function loginBetaSaga() {
  if (!Cookies.get("beta"))
    Cookies.set("beta", "authenticated", { expires: 0.5 });
}

function logoutBetaSaga() {
  if (Cookies.get("beta")) Cookies.remove("beta");
}

function* oauthLoginSaga({
  payload,
}: PayloadAction<{
  provider: "google" | "discord";
  idToken?: string;
  code?: string;
  redirectUri?: string;
}>) {
  yield put({ type: queueLogin.type });
  try {
    let user: IAuthUser;
    if (payload.provider === "google") {
      user = yield call(postGoogleLogin, payload.idToken!);
    } else {
      user = yield call(postDiscordLogin, payload.code!, payload.redirectUri!);
    }
    yield put({ type: loginSuccess.type, payload: { user, token: "" } });
  } catch (error) {
    console.error("OAuth login failed:", error);
  }
  yield put({ type: clearQueueLogin.type });
}

function* logoutSaga() {
  try {
    yield call(postLogout);
  } catch (error) {
    console.error("Logout request failed:", error);
  }
  yield put({ type: logout.type });
}

export function* userSaga() {
  yield all([
    takeLatest(login.type, loginSaga),
    takeLatest(requestLoginBeta.type, requestLoginBetaSaga),
    takeLatest(loginBeta.type, loginBetaSaga),
    takeLatest(logoutBeta.type, logoutBetaSaga),
    takeLatest(requestOAuthLogin.type, oauthLoginSaga),
    takeLatest(requestLogout.type, logoutSaga),
  ]);
}
