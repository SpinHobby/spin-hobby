import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import rootReducer from "./reducers";
import rootSaga from "./saga";
import { CART_STORAGE_KEY } from "./reducers/cartReducer";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }).concat(sagaMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

sagaMiddleware.run(rootSaga);

// Cart has no backend to persist to, so keep it in localStorage instead.
store.subscribe(() => {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(store.getState().cart.items)
  );
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
