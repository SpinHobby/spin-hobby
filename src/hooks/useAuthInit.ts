import { useEffect } from "react";
import { useDispatch } from "react-redux";
import SquareAuthService from "../api/squareAuth";
import { getMe } from "../api/customerAuth";
import { initializeAuth } from "../reducers/userReducer";

/**
 * Hook to initialize authentication state on app load. Runs two independent
 * checks - merchant/admin (Square OAuth, localStorage token) and customer
 * (OAuth login, httpOnly session cookie). These are different trust domains
 * and never satisfy each other; whichever one actually has a valid session
 * wins (in practice only one will, since they're used on different pages).
 */
export const useAuthInit = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    initializeAuthState();
  }, [dispatch]);

  const initializeAuthState = async () => {
    try {
      const token = SquareAuthService.getToken();
      const user = SquareAuthService.getUser();

      if (token && user) {
        const isValid = await SquareAuthService.verifyToken();
        if (isValid) {
          await SquareAuthService.refreshTokenIfNeeded();
          dispatch(initializeAuth({ user, token }));
          return;
        }
        SquareAuthService.logout();
      }
    } catch (error) {
      console.error("Error initializing merchant auth state:", error);
      SquareAuthService.logout();
    }

    try {
      const customer = await getMe();
      if (customer) {
        dispatch(initializeAuth({ user: customer, token: "" }));
        return;
      }
    } catch (error) {
      console.error("Error initializing customer auth state:", error);
    }

    dispatch(initializeAuth(null));
  };
};

export default useAuthInit;
