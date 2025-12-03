import PropTypes from 'prop-types';
import { t } from '@superset-ui/core';

import { aggregators } from './AggregatorTemplates';
import { aggregatorsFactory, flatKey, getSort, naturalSort } from './utils';
import { VALS } from './constants';

class PivotData {
  constructor(inputProps = {}, subtotals = {}) {
    this.props = { ...PivotData.defaultProps, ...inputProps };
    this.processRecord = this.processRecord.bind(this);
    PropTypes.checkPropTypes(
      PivotData.propTypes,
      this.props,
      'prop',
      'PivotData',
    );

    this.aggregator = aggregatorsFactory(this.props.defaultFormatter)[
      this.props.aggregatorName
    ](VALS);
    this.formattedAggregators =
      this.props.customFormatters &&
      Object.entries(this.props.customFormatters).reduce(
        (acc, [key, columnFormatter]) => {
          acc[key] = {};
          Object.entries(columnFormatter).forEach(([column, formatter]) => {
            acc[key][column] =
              aggregatorsFactory(formatter)[this.props.aggregatorName](VALS);
          });
          return acc;
        },
        {},
      );
    this.tree = {};
    this.rowKeys = [];
    this.colKeys = [];
    this.rowTotals = {};
    this.colTotals = {};
    this.allTotal = this.aggregator(this, [], []);
    this.subtotals = subtotals;
    this.sorted = false;

    // iterate through input, accumulating data for cells
    PivotData.forEachRecord(this.props.data, this.processRecord);
  }

  getFormattedAggregator(record, totalsKeys) {
    if (!this.formattedAggregators) {
      return this.aggregator;
    }
    const [groupName, groupValue] =
      Object.entries(record).find(
        ([name, value]) =>
          this.formattedAggregators[name] &&
          this.formattedAggregators[name][value],
      ) || [];
    if (
      !groupName ||
      !groupValue ||
      (totalsKeys && !totalsKeys.includes(groupValue))
    ) {
      return this.aggregator;
    }
    return this.formattedAggregators[groupName][groupValue] || this.aggregator;
  }

  arrSort(attrs, partialOnTop, reverse = false) {
    const sortersArr = attrs.map(a => getSort(this.props.sorters, a));
    return function (a, b) {
      const limit = Math.min(a.length, b.length);
      for (let i = 0; i < limit; i += 1) {
        const sorter = sortersArr[i];
        const comparison = reverse ? sorter(b[i], a[i]) : sorter(a[i], b[i]);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return partialOnTop ? a.length - b.length : b.length - a.length;
    };
  }

  sortKeys() {
    if (!this.sorted) {
      this.sorted = true;
      const v = (r, c) => this.getAggregator(r, c).value();
      switch (this.props.rowOrder) {
        case 'key_z_to_a':
          this.rowKeys.sort(
            this.arrSort(this.props.rows, this.subtotals.rowPartialOnTop, true),
          );
          break;
        case 'value_a_to_z':
          this.rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])));
          break;
        case 'value_z_to_a':
          this.rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])));
          break;
        default:
          this.rowKeys.sort(
            this.arrSort(this.props.rows, this.subtotals.rowPartialOnTop),
          );
      }
      switch (this.props.colOrder) {
        case 'key_z_to_a':
          this.colKeys.sort(
            this.arrSort(this.props.cols, this.subtotals.colPartialOnTop, true),
          );
          break;
        case 'value_a_to_z':
          this.colKeys.sort((a, b) => naturalSort(v([], a), v([], b)));
          break;
        case 'value_z_to_a':
          this.colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)));
          break;
        default:
          this.colKeys.sort(
            this.arrSort(this.props.cols, this.subtotals.colPartialOnTop),
          );
      }
    }
  }

  getColKeys() {
    this.sortKeys();
    return this.colKeys;
  }

  getRowKeys() {
    this.sortKeys();
    return this.rowKeys;
  }

  processRecord(record) {
    // this code is called in a tight loop
    const colKey = [];
    const rowKey = [];
    this.props.cols.forEach(col => {
      colKey.push(col in record ? record[col] : 'null');
    });
    this.props.rows.forEach(row => {
      rowKey.push(row in record ? record[row] : 'null');
    });

    this.allTotal.push(record);

    const rowStart = this.subtotals.rowEnabled ? 1 : Math.max(1, rowKey.length);
    const colStart = this.subtotals.colEnabled ? 1 : Math.max(1, colKey.length);

    let isRowSubtotal;
    let isColSubtotal;
    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);
      if (!this.rowTotals[flatRowKey]) {
        this.rowKeys.push(fRowKey);
        this.rowTotals[flatRowKey] = this.getFormattedAggregator(
          record,
          rowKey,
        )(this, fRowKey, []);
      }
      this.rowTotals[flatRowKey].push(record);
      this.rowTotals[flatRowKey].isSubtotal = isRowSubtotal;
    }

    for (let ci = colStart; ci <= colKey.length; ci += 1) {
      isColSubtotal = ci < colKey.length;
      const fColKey = colKey.slice(0, ci);
      const flatColKey = flatKey(fColKey);
      if (!this.colTotals[flatColKey]) {
        this.colKeys.push(fColKey);
        this.colTotals[flatColKey] = this.getFormattedAggregator(
          record,
          colKey,
        )(this, [], fColKey);
      }
      this.colTotals[flatColKey].push(record);
      this.colTotals[flatColKey].isSubtotal = isColSubtotal;
    }

    // And now fill in for all the sub-cells.
    for (let ri = rowStart; ri <= rowKey.length; ri += 1) {
      isRowSubtotal = ri < rowKey.length;
      const fRowKey = rowKey.slice(0, ri);
      const flatRowKey = flatKey(fRowKey);
      if (!this.tree[flatRowKey]) {
        this.tree[flatRowKey] = {};
      }
      for (let ci = colStart; ci <= colKey.length; ci += 1) {
        isColSubtotal = ci < colKey.length;
        const fColKey = colKey.slice(0, ci);
        const flatColKey = flatKey(fColKey);
        if (!this.tree[flatRowKey][flatColKey]) {
          this.tree[flatRowKey][flatColKey] = this.getFormattedAggregator(
            record,
          )(this, fRowKey, fColKey);
        }
        this.tree[flatRowKey][flatColKey].push(record);

        this.tree[flatRowKey][flatColKey].isRowSubtotal = isRowSubtotal;
        this.tree[flatRowKey][flatColKey].isColSubtotal = isColSubtotal;
        this.tree[flatRowKey][flatColKey].isSubtotal =
          isRowSubtotal || isColSubtotal;
      }
    }
  }

  getAggregator(rowKey, colKey) {
    let agg;
    const flatRowKey = flatKey(rowKey);
    const flatColKey = flatKey(colKey);
    if (rowKey.length === 0 && colKey.length === 0) {
      agg = this.allTotal;
    } else if (rowKey.length === 0) {
      agg = this.colTotals[flatColKey];
    } else if (colKey.length === 0) {
      agg = this.rowTotals[flatRowKey];
    } else {
      agg = this.tree[flatRowKey][flatColKey];
    }
    return (
      agg || {
        value() {
          return null;
        },
        format() {
          return '';
        },
      }
    );
  }
}

// can handle arrays or jQuery selections of tables
PivotData.forEachRecord = function (input, processRecord) {
  if (Array.isArray(input)) {
    // array of objects
    return input.map(record => processRecord(record));
  }
  throw new Error(t('Unknown input format'));
};

PivotData.defaultProps = {
  aggregators,
  cols: [],
  rows: [],
  vals: [],
  aggregatorName: 'Count',
  sorters: {},
  rowOrder: 'key_a_to_z',
  colOrder: 'key_a_to_z',
};

PivotData.propTypes = {
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

export { PivotData };
