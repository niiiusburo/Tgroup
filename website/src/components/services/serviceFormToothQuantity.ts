export function syncQuantityWithSelectedTeeth(
  selectedTeeth: readonly string[],
  currentQuantity: number,
  previousTeeth: readonly string[],
): number {
  if (selectedTeeth.length === 0) return currentQuantity;
  if (previousTeeth.length === 0) return selectedTeeth.length;
  if (currentQuantity <= 1) return selectedTeeth.length;
  if (currentQuantity === previousTeeth.length) return selectedTeeth.length;
  return currentQuantity;
}
