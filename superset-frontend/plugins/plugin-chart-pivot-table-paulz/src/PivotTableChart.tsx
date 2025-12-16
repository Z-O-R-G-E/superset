import { MainLayout } from './components/MainLayout';
import { useFormatters } from './hooks/useFormatters';
import { usePivotData } from './hooks/usePivotData';
import { useTableOptions } from './hooks/useTableOptions';
import { PivotTableProps } from './types';
import { useSubtotalOptions } from './hooks/useSubtotalOptions';
import PivotTable from './react-pivottable/PivotTable';
import { useHandleContextMenu } from './hooks/useHandleContextMenu';
import { useToggleFilter } from './hooks/useToggleFilter';

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
    ratios,
  } = props;

  const formatters = useFormatters({
    valueFormat,
    currencyFormat,
    columnFormats,
    currencyFormats,
  });

  const unpivotedData = usePivotData({
    data,
    metrics,
    groupbyRows,
    groupbyColumns,
    transposePivot,
    combineMetric,
    metricsLayout,
  });

  const { cols, rows } = unpivotedData;

  const handleContextMenu = useHandleContextMenu({
    cols,
    rows,
    groupbyRows,
    groupbyColumns,
    selectedFilters,
    onContextMenu,
    dateFormatters,
    timeGrainSqla,
  });

  const toggleFilter = useToggleFilter({
    groupbyRows,
    groupbyColumns,
    setDataMask,
    selectedFilters,
    emitCrossFilters,
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
        unpivotedData={unpivotedData}
        formatters={formatters}
        aggregatorName={aggregateFunction}
        colOrder={colOrder}
        rowOrder={rowOrder}
        tableOptions={tableOptions}
        subtotalOptions={subtotalOptions}
        namesMapping={verboseMap}
        onContextMenu={handleContextMenu}
        ratios={ratios}
      />
    </MainLayout>
  );
}
