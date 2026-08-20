import { PayloadAction } from "@reduxjs/toolkit";
import { takeLatest, all, put, call } from "redux-saga/effects";
import { IMerchPreview } from "../ts";
import { getSearch, setSearchResult, setSearchError } from "../reducers";
import { getSearchResult } from "../api";
import { getInventoryCounts } from "../api/square";

function* fetchSearchResult({
  payload,
}: PayloadAction<{
  page: number;
  searchString: string;
  category?: string;
  categoryIds?: string[];
}>) {
  try {
    const searchResult: IMerchPreview[] = yield getSearchResult(
      payload.page,
      payload.searchString,
      payload.category,
      payload.categoryIds
    );

    const variationIds = searchResult
      .map((item) => item.variationId)
      .filter((id): id is string => !!id);

    let withStock = searchResult;
    if (variationIds.length > 0) {
      try {
        const counts: Record<string, number> = yield call(getInventoryCounts, variationIds);
        withStock = searchResult.map((item) =>
          item.variationId && item.variationId in counts
            ? { ...item, stockCount: counts[item.variationId] }
            : item
        );
      } catch (err) {
        console.error("Error loading inventory counts for search:", err);
      }
    }

    // Sold-out items (tracked stock at exactly 0) sink to the bottom of
    // results; a stable sort keeps everything else in its original
    // relevance order.
    const sorted = [...withStock].sort(
      (a, b) => (a.stockCount === 0 ? 1 : 0) - (b.stockCount === 0 ? 1 : 0)
    );

    yield put(
      setSearchResult({
        page: payload.page,
        searchResult: sorted,
      })
    );
  } catch (err) {
    yield put(setSearchError(err));
  }
}

export function* searchSaga() {
  yield all([takeLatest(getSearch.type, fetchSearchResult)]);
}
