export function shallowEqual(
  objA: Record<string, any> | null | undefined,
  objB: Record<string, any> | null | undefined,
): boolean {
  if (objA === objB) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!(key in objB) || objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}
