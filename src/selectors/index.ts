import { useSelector } from "react-redux";
import { IRootState } from "../reducers";

export function useModalSelector() {
  return useSelector((state: IRootState) => state.modal);
}

export function useCurrencySelector() {
  return useSelector((state: IRootState) => state.setting.currency);
}

export function useCartSelector() {
  return useSelector((state: IRootState) => state.cart);
}

export function useUserSelector() {
  return useSelector((state: IRootState) => state.user);
}

export function useSearchSelector() {
  return useSelector((state: IRootState) => state.search.searchResult);
}

export function useBetaSelector() {
  return useSelector((state: IRootState) => state.user.beta);
}

export function useAwaitLoginSelector() {
  return useSelector((state: IRootState) => state.user.awaitingLoginRes);
}

export function useThemeSelector() {
  return useSelector((state: IRootState) => state.setting.theme);
}
