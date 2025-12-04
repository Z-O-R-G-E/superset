import { naturalSort } from '../naturalSort';

export const sortAs = (metricNames: string[]) => {
  const mapping = {};
  const lMapping = {};
  metricNames.forEach((metricName, index) => {
    mapping[metricName] = index;
    lMapping[metricName.toLowerCase()] = index;
  });
  return function (a: string | number, b: string | number) {
    if (a in mapping && b in mapping) {
      return mapping[a] - mapping[b];
    }
    if (a in mapping) {
      return -1;
    }
    if (b in mapping) {
      return 1;
    }
    if (a in lMapping && b in lMapping) {
      return lMapping[a] - lMapping[b];
    }
    if (a in lMapping) {
      return -1;
    }
    if (b in lMapping) {
      return 1;
    }
    return naturalSort(a, b);
  };
};
