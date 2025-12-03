import PropTypes from 'prop-types';
import { t } from '@superset-ui/core';
import { aggregatorsFactory, flatKey, getSort, naturalSort } from './utils';
import { aggregators } from './utils/aggregatorTemplates';

const VALS = ['value'];

const defaultProps = {
  aggregators,
  cols: [],
  rows: [],
  vals: [],
  aggregatorName: 'Count',
  sorters: {},
  rowOrder: 'key_a_to_z',
  colOrder: 'key_a_to_z',
};

const propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object, PropTypes.func])
    .isRequired,
  aggregatorName: PropTypes.string,
  cols: PropTypes.arrayOf(PropTypes.string),
  rows: PropTypes.arrayOf(PropTypes.string),
  vals: PropTypes.arrayOf(PropTypes.string),
  valueFilter: PropTypes.objectOf(PropTypes.objectOf(PropTypes.bool)),
  sorters: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.objectOf(PropTypes.func),
  ]),
  derivedAttributes: PropTypes.objectOf(PropTypes.func),
  rowOrder: PropTypes.oneOf([
    'key_a_to_z',
    'key_z_to_a',
    'value_a_to_z',
    'value_z_to_a',
  ]),
  colOrder: PropTypes.oneOf([
    'key_a_to_z',
    'key_z_to_a',
    'value_a_to_z',
    'value_z_to_a',
  ]),
};

export const createPivotData = (inputProps = {}, subtotals = {}) => {
  const props = { ...defaultProps, ...inputProps };
  PropTypes.checkPropTypes(propTypes, props, 'prop', 'PivotData');

  const aggregator = aggregatorsFactory(props.defaultFormatter)[
    props.aggregatorName
  ](VALS);

  const formattedAggregators = props.customFormatters
    ? Object.fromEntries(
        Object.entries(props.customFormatters).map(([key, columnFormatter]) => [
          key,
          Object.fromEntries(
            Object.entries(columnFormatter).map(([column, formatter]) => [
              column,
              aggregatorsFactory(formatter)[props.aggregatorName](VALS),
            ]),
          ),
        ]),
      )
    : null;

  const tree = {};
  const rowKeys = [];
  const colKeys = [];
  const rowTotals = {};
  const colTotals = {};
  const allTotal = aggregator({}, [], []);
  let sorted = false;

  const getAggregator = (rowKey, colKey) => {
    const flatRowKey = flatKey(rowKey);
    const flatColKey = flatKey(colKey);

    const agg =
      rowKey.length === 0 && colKey.length === 0
        ? allTotal
        : rowKey.length === 0
          ? colTotals[flatColKey]
          : colKey.length === 0
            ? rowTotals[flatRowKey]
            : tree[flatRowKey][flatColKey];

    return (
      agg || {
        value: () => null,
        format: () => '',
      }
    );
  };

  const getFormattedAggregator = (record, totalsKeys) => {
    if (!formattedAggregators) return aggregator;

    const [groupName, groupValue] =
      Object.entries(record).find(
        ([name, value]) =>
          formattedAggregators[name] && formattedAggregators[name][value],
      ) || [];

    if (
      !groupName ||
      !groupValue ||
      (totalsKeys && !totalsKeys.includes(groupValue))
    ) {
      return aggregator;
    }
    return formattedAggregators[groupName][groupValue] || aggregator;
  };

  const arrSort = (attrs, partialOnTop, reverse = false) => {
    const sortersArr = attrs.map(a => getSort(props.sorters, a));
    return (a, b) => {
      const limit = Math.min(a.length, b.length);
      for (let i = 0; i < limit; i += 1) {
        const sorter = sortersArr[i];
        const comparison = reverse ? sorter(b[i], a[i]) : sorter(a[i], b[i]);
        if (comparison !== 0) return comparison;
      }
      return partialOnTop ? a.length - b.length : b.length - a.length;
    };
  };

  const sortKeys = () => {
    if (sorted) return;
    sorted = true;

    const v = (r, c) => getAggregator(r, c).value();

    // сортировка строк
    switch (props.rowOrder) {
      case 'key_z_to_a':
        rowKeys.sort(arrSort(props.rows, subtotals.rowPartialOnTop, true));
        break;
      case 'value_a_to_z':
        rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
        break;
      case 'value_z_to_a':
        rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
        break;
      default:
        rowKeys.sort(arrSort(props.rows, subtotals.rowPartialOnTop));
    }

    // сортировка колонок
    switch (props.colOrder) {
      case 'key_z_to_a':
        colKeys.sort(arrSort(props.cols, subtotals.colPartialOnTop, true));
        break;
      case 'value_a_to_z':
        colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
        break;
      case 'value_z_to_a':
        colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
        break;
      default:
        colKeys.sort(arrSort(props.cols, subtotals.colPartialOnTop));
    }
  };

  const getRowKeys = () => {
    sortKeys();
    return rowKeys;
  };

  const getColKeys = () => {
    sortKeys();
    return colKeys;
  };

  const processRecord = record => {
    const colKey = props.cols.map(col =>
      col in record ? record[col] : 'null',
    );
    const rowKey = props.rows.map(row =>
      row in record ? record[row] : 'null',
    );

    allTotal.push(record);

    const rowStart = subtotals.rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = subtotals.colEnabled ? 1 : Math.max(1, colKey.length);

    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);

      if (!rowTotals[flatRowKey]) {
        rowKeys.push(fRowKey);
        rowTotals[flatRowKey] = getFormattedAggregator(record, rowKey)(
          {},
          fRowKey,
          [],
        );
      }
      rowTotals[flatRowKey].push(record);
      rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      const isColSubtotal = ci < colKey.length;
      const fColKey = colKey.slice(0, ci);
      const flatColKey = flatKey(fColKey);

      if (!colTotals[flatColKey]) {
        colKeys.push(fColKey);
        colTotals[flatColKey] = getFormattedAggregator(record, colKey)(
          {},
          [],
          fColKey,
        );
      }
      colTotals[flatColKey].push(record);
      colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    // заполнение ячеек
    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      const isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);
      if (!tree[flatRowKey]) tree[flatRowKey] = {};

      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        const isColSubtotal = ci < colKey.length;
        const fColKey = colKey.slice(0, ci);
        const flatColKey = flatKey(fColKey);

        if (!tree[flatRowKey][flatColKey]) {
          tree[flatRowKey][flatColKey] = getFormattedAggregator(record)(
            {},
            fRowKey,
            fColKey,
          );
        }
        tree[flatRowKey][flatColKey].push(record);
        tree[flatRowKey][flatColKey].isRowSubtotal = isRowSubtotal;
        tree[flatRowKey][flatColKey].isColSubtotal = isColSubtotal;
        tree[flatRowKey][flatColKey].isSubtotal =
          isRowSubtotal || isColSubtotal;
      }
    }
  };

  // обработка данных
  (Array.isArray(props.data)
    ? props.data
    : (() => {
        throw new Error(t('Unknown input format'));
      })()
  ).forEach(processRecord);

  return {
    getAggregator,
    getRowKeys,
    getColKeys,
    processRecord,
  };
};
