import { PRODUCT_TYPES, PRODUCT_TYPES_LIST } from "./productTypes";

/** The suggestions for an input with `list={PRODUCT_TYPES_LIST}`; render once beside that input. */
export function ProductTypeOptions() {
  return (
    <datalist id={PRODUCT_TYPES_LIST}>
      {PRODUCT_TYPES.map((t) => (
        <option key={t} value={t} />
      ))}
    </datalist>
  );
}
