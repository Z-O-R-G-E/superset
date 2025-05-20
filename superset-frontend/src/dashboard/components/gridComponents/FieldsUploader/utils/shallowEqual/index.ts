export const shallowEqual = <T extends Record<string, unknown>>(
  a: T,
  b: T,
): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;

  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => a[key] === b[key]);
};
