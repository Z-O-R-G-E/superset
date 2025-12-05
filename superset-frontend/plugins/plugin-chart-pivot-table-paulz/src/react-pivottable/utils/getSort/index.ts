import { naturalSort } from '../naturalSort';

export type SortFn = (a: string | number, b: string | number) => number;

export type SortersMap = Record<string, SortFn>;
export type SortersInput =
  | SortersMap
  | ((attr: string) => SortFn | undefined)
  | null
  | undefined;

export function getSort(sorters: SortersInput, attr: string): SortFn {
  if (sorters) {
    if (typeof sorters === 'function') {
      const sort = sorters(attr);
      if (typeof sort === 'function') {
        return sort;
      }
    } else if (attr in sorters) {
      return sorters[attr];
    }
  }

  return naturalSort;
}
