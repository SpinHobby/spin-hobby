import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { IMerchPreview } from "../ts";

export interface ISearchState {
  page: number;
  searchResult: IMerchPreview[];
  error: string;
}

const initialState: ISearchState = {
  page: 0,
  searchResult: [
    {
      title: "Lucy",
      img: "https://solarisjapan.com/cdn/shop/products/HOB-FIG-3750_01.jpg?v=1570304620",
      price: 50,
      description: "Nice Figurine",
    },
    {
      title: "Lambo",
      img: "https://medialamborghini-meride-tv.akamaized.net/meride/lamborghini/video/images/folder1/1252/vlcsnap-2023-03-17-16h18m30s840.jpg",
      price: 300000,
      description: "A very fast car",
    },
  ],
  error: "",
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    getSearch: (
      state,
      action: PayloadAction<{
        page: number;
        searchString: string;
        category?: string;
        categoryIds?: string[];
      }>
    ) => {},
    setSearchResult: (state, action) => {
      state.page = action.payload.page;
      state.searchResult = action.payload.searchResult;
    },
    setSearchError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { getSearch, setSearchResult, setSearchError } =
  searchSlice.actions;

export default searchSlice.reducer;
