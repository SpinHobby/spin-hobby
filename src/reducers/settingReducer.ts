import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ECurrencies } from "../ts";
import { baseCurrency } from "../ts/constants";
import { Theme, getInitialTheme } from "../utils/theme";

export interface ICurrencyState {
  base: ECurrencies;
  conversion: ECurrencies;
  rate: number;
}

export interface ISettingState {
  currency: ICurrencyState;
  theme: Theme;
}

const initialState: ISettingState = {
  currency: {
    base: baseCurrency,
    conversion: baseCurrency,
    rate: 1,
  },
  theme: getInitialTheme(),
};

const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {
    setConversionCurrency: (state, action: PayloadAction<ECurrencies>) => {
      state.currency.conversion = action.payload;
    },
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
    },
  },
});

export const { setConversionCurrency, setTheme, toggleTheme } = settingSlice.actions;

export default settingSlice.reducer;
