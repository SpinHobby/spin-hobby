import { combineReducers } from "@reduxjs/toolkit";
import modalReducer, { ModalState, hideModal, openModal } from "./modalReducer";
import settingReducer, {
  ISettingState,
  setConversionCurrency,
  // setCurrencyRate,
  // resetCurrency,
} from "./settingReducer";
import userReducer, {
  IUserState,
  login,
  loginSquare,
  loginSuccess,
  logout,
  setUser,
  requestLoginBeta,
  requestOAuthLogin,
  requestLogout,
  loginBeta,
  logoutBeta,
  queueLogin,
  clearQueueLogin,
  initializeAuth,
} from "./userReducer";
import cartReducer, {
  ICartState,
  addItem,
  setQuantity,
  removeItem,
  clearCart,
  setError,
} from "./cartReducer";
import {
  ISearchState,
  getSearch,
  setSearchResult,
  setSearchError,
} from "./searchReducer";
import searchReducer from "./searchReducer";

export default combineReducers({
  setting: settingReducer,
  modal: modalReducer,
  user: userReducer,
  cart: cartReducer,
  search: searchReducer,
});

export interface IRootState {
  setting: ISettingState;
  modal: ModalState;
  user: IUserState;
  cart: ICartState;
  search: ISearchState;
}

export {
  hideModal,
  openModal,
  setConversionCurrency,
  login,
  loginSquare,
  loginSuccess,
  logout,
  setUser,
  requestLoginBeta,
  requestOAuthLogin,
  requestLogout,
  queueLogin,
  clearQueueLogin,
  initializeAuth,
  loginBeta,
  logoutBeta,
  addItem,
  setQuantity,
  removeItem,
  clearCart,
  setError,
  getSearch,
  setSearchResult,
  setSearchError,

  // setCurrencyRate,
  // resetCurrency,
};
