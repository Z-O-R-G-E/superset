export type ParsedRatios = {
  ratio: string;
  num: string;
  denom: string;
};

export const parseRatios = (arr: string[]): ParsedRatios[] => {
  const result: ParsedRatios[] = [];
  const arrLength = arr?.length;

  if (!arrLength) return [];

  if (arrLength % 3 !== 0) {
    throw new Error('Длина массива должна быть кратна 3');
  }

  for (let i = 0; i < arrLength; i += 3) {
    const item: ParsedRatios = {
      ratio: arr[i],
      num: arr[i + 1],
      denom: arr[i + 2],
    };
    result.push(item);
  }

  return result;
};
