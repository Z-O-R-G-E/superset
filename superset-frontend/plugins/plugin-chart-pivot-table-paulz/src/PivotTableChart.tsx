import { useCallback } from 'react';
import { MainLayout } from './components/MainLayout';
import { useFormatters } from './hooks/useFormatters';
import { usePivotData } from './hooks/usePivotData';
import { useFilters } from './hooks/useFilters';
import { useTableOptions } from './hooks/useTableOptions';
import { VALS } from './constants';
import { PivotTableProps } from './types';
import { useSubtotalOptions } from './hooks/useSubtotalOptions';
import { PivotTable } from './react-pivottable/PivotTable';

export default function PivotTableChart(props: PivotTableProps) {
  const {
    data,
    height,
    width,
    availableFields,
    groupbyRows,
    groupbyColumns,
    availableMetrics,
    metrics,
    colOrder,
    rowOrder,
    aggregateFunction,
    transposePivot,
    combineMetric,
    rowSubtotalPosition,
    colSubtotalPosition,
    colTotals,
    colSubTotals,
    rowTotals,
    rowSubTotals,
    valueFormat,
    currencyFormat,
    emitCrossFilters,
    setDataMask,
    setControlValue,
    selectedFilters,
    verboseMap,
    columnFormats,
    currencyFormats,
    metricsLayout,
    metricColorFormatters,
    dateFormatters,
    onContextMenu,
    timeGrainSqla,
  } = props;

  const { defaultFormatter, metricFormatters } = useFormatters({
    valueFormat,
    currencyFormat,
    columnFormats,
    currencyFormats,
  });

  const { unpivotedData, rows, cols, sorters } = usePivotData({
    data,
    metrics,
    groupbyRows,
    groupbyColumns,
    transposePivot,
    combineMetric,
    metricsLayout,
  });

  const { toggleFilter, handleContextMenu } = useFilters({
    groupbyRows,
    groupbyColumns,
    setDataMask,
    selectedFilters,
    emitCrossFilters,
    onContextMenu,
    dateFormatters,
    timeGrainSqla,
  });

  const tableOptions = useTableOptions({
    colTotals,
    colSubTotals,
    rowTotals,
    rowSubTotals,
    emitCrossFilters,
    metricColorFormatters,
    dateFormatters,
    selectedFilters,
    toggleFilter,
  });

  const subtotalOptions = useSubtotalOptions({
    colSubtotalPosition,
    rowSubtotalPosition,
  });

  const wrappedHandleContextMenu = useCallback(
    (
      e: MouseEvent,
      colKey: (string | number | boolean)[] | undefined,
      rowKey: (string | number | boolean)[] | undefined,
      dataPoint: { [key: string]: string },
    ) => {
      handleContextMenu(e, colKey, rowKey, dataPoint, rows, cols);
    },
    [handleContextMenu, rows, cols],
  );

  return (
    <MainLayout
      key="main-layout"
      height={height}
      width={width}
      setControlValue={setControlValue}
      setDataMask={setDataMask}
      availableMetrics={availableMetrics}
      metrics={metrics}
      availableFields={availableFields}
      groupbyColumns={groupbyColumns}
      groupbyRows={groupbyRows}
      aggregateFunction={aggregateFunction}
      metricsLayout={metricsLayout}
    >
      <PivotTable
        data={unpivotedData}
        rows={rows}
        cols={cols}
        defaultFormatter={defaultFormatter}
        customFormatters={metricFormatters}
        aggregatorName={aggregateFunction}
        vals={VALS}
        colOrder={colOrder}
        rowOrder={rowOrder}
        sorters={sorters}
        tableOptions={tableOptions}
        subtotalOptions={subtotalOptions}
        namesMapping={verboseMap}
        onContextMenu={wrappedHandleContextMenu}
      />
    </MainLayout>
  );
}
