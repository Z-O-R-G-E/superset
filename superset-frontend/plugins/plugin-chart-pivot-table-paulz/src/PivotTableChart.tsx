import { MainLayout } from './components/MainLayout';
import { useFormatters } from './hooks/useFormatters';
import { usePivotData } from './hooks/usePivotData';
import { useFilters } from './hooks/useFilters';
import { useTableOptions } from './hooks/useTableOptions';
import { PivotTableProps } from './types';
import { useSubtotalOptions } from './hooks/useSubtotalOptions';
import PivotTable from './react-pivottable/PivotTable';

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
    rowSubtotalPosition = false,
    colSubtotalPosition = false,
    colTotals = true,
    colSubTotals,
    rowTotals = true,
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

  const formatters = useFormatters({
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
    cols,
    rows,
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
        sorters={sorters}
        formatters={formatters}
        aggregatorName={aggregateFunction}
        colOrder={colOrder}
        rowOrder={rowOrder}
        tableOptions={tableOptions}
        subtotalOptions={subtotalOptions}
        namesMapping={verboseMap}
        onContextMenu={handleContextMenu}
      />
    </MainLayout>
  );
}
