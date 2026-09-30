/**
 * The currencies should work with the api request to
 * https://api.exchangeratesapi.io/
 */

export enum ECurrencies {
  CAD = "CAD",
  EUR = "EUR",
  USD = "USD",
  JPY = "JPY",
  CNY = "CNY",
  HKD = "HKD",
  KRW = "KRW",
}

// Several currencies share a symbol, so duplicate values are intentional here.
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum ECurrencySymbols {
  CAD = "$",
  EUR = "€",
  USD = "$",
  JPY = "¥",
  CNY = "¥",
  HKD = "$",
  KRW = "₩",
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

export enum ECurrencyCodes {
  CAD = "CAD",
  EUR = "EUR",
  USD = "USD",
  JPY = "JPY",
  CNY = "CNY",
  HKD = "HKD",
  KRW = "KRW",
}

export enum ECurrencyTexts {
  CAD = "Canadian dollar",
  EUR = "Euro",
  USD = "United States dollar",
  JPY = "Japanese Yen",
  CNY = "Chinese Yuan",
  HKD = "Hong Kong dollar",
  KRW = "South Korean won",
}
