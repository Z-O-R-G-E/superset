const rx = /(\d+)|(\D+)/g;
const rd = /\d/;
const rz = /^0/;

export const naturalSort = (as: string | number, bs: string | number) => {
  // nulls first
  if (bs !== null && as === null) return -1;
  if (as !== null && bs === null) return 1;

  // raw NaNs
  if (typeof as === 'number' && Number.isNaN(as)) return -1;
  if (typeof bs === 'number' && Number.isNaN(bs)) return 1;

  // numbers and numbery strings
  const nas = Number(as);
  const nbs = Number(bs);
  if (nas < nbs) return -1;
  if (nas > nbs) return 1;

  // true numbers before numbery strings
  if (typeof as === 'number' && typeof bs !== 'number') return -1;
  if (typeof bs === 'number' && typeof as !== 'number') return 1;
  if (typeof as === 'number' && typeof bs === 'number') return 0;

  // textual numbers vs non-numbers
  if (Number.isNaN(nbs) && !Number.isNaN(nas)) return -1;
  if (Number.isNaN(nas) && !Number.isNaN(nbs)) return 1;

  // string comparison
  const aStr = String(as);
  const bStr = String(bs);
  if (aStr === bStr) return 0;
  if (!rd.test(aStr) || !rd.test(bStr)) return aStr > bStr ? 1 : -1;

  // split strings into number and non-number chunks
  const aParts = aStr.match(rx) ?? [];
  const bParts = bStr.match(rx) ?? [];

  while (aParts.length && bParts.length) {
    const a1 = aParts.shift()!;
    const b1 = bParts.shift()!;
    if (a1 !== b1) {
      if (rd.test(a1) && rd.test(b1)) {
        return Number(a1.replace(rz, '.0')) - Number(b1.replace(rz, '.0'));
      }
      return a1 > b1 ? 1 : -1;
    }
  }

  return aParts.length - bParts.length;
};
