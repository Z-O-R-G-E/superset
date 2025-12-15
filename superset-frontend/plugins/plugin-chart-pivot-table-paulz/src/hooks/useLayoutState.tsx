import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import { HandlerFunction, SetDataMaskHook } from '@superset-ui/core';
import { ContainerType, ItemType } from '../types';
import { getItemName } from '../utils/getItemName';
import { CONTAINER_TYPES } from '../constants';

export type LayoutStateProps = {
  columns: ItemType[];
  rows: ItemType[];
  metrics: ItemType[];
  availableFields: ItemType[];
  availableMetrics: ItemType[];
  setControlValue: HandlerFunction;
  setDataMask?: SetDataMaskHook;
};

export const useLayoutState = ({
  columns,
  rows,
  metrics,
  availableFields,
  availableMetrics,
  setControlValue,
  setDataMask,
}: LayoutStateProps) => {
  const [state, setState] = useState<
    Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'>
  >({
    columns,
    rows,
    metrics,
  });

  const stateRef =
    useRef<Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'>>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateDataMaskWith = useCallback(
    (nextState: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'>) => {
      const { columns, rows, metrics: _metrics } = nextState;
      setControlValue('groupbyColumns', columns);
      setControlValue('groupbyRows', rows);
      setControlValue('metrics', _metrics);

      setDataMask?.({
        filterState: {
          value: [...columns, ...rows, ..._metrics],
          label: [...columns, ...rows, ..._metrics].map(getItemName),
        },
        ownState: {
          refreshKey: Date.now(),
          groupbyColumns: columns,
          groupbyRows: rows,
          metrics: _metrics,
        },
      });
    },
    [setControlValue, setDataMask],
  );

  const addItem = useCallback((container: ContainerType, items: ItemType[]) => {
    setState(prev => {
      const next: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'> = {
        ...prev,
      };
      if (container === CONTAINER_TYPES.COLUMN)
        next.columns = [...prev.columns, ...items];
      if (container === CONTAINER_TYPES.ROW)
        next.rows = [...prev.rows, ...items];
      if (container === CONTAINER_TYPES.METRIC)
        next.metrics = [...prev.metrics, ...items];

      stateRef.current = next;
      return next;
    });
  }, []);

  const removeItem = useCallback(
    (container: ContainerType, item: ItemType) => {
      setState(prev => {
        const name = getItemName(item);
        const next: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'> = {
          ...prev,
        };

        if (container === CONTAINER_TYPES.COLUMN) {
          next.columns = prev.columns.filter(i => getItemName(i) !== name);
        } else if (container === CONTAINER_TYPES.ROW) {
          next.rows = prev.rows.filter(i => getItemName(i) !== name);
        } else if (container === CONTAINER_TYPES.METRIC) {
          next.metrics = prev.metrics.filter(i => getItemName(i) !== name);
        }

        stateRef.current = next;
        updateDataMaskWith(next);

        return next;
      });
    },
    [updateDataMaskWith],
  );

  const moveItem = useCallback(
    (
      from: ContainerType,
      to: ContainerType,
      item: ItemType,
      toIndex?: number,
    ) => {
      setState(prev => {
        const next: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'> = {
          ...prev,
        };

        const removeFrom = (arr: ItemType[]) =>
          arr.filter(i => getItemName(i) !== getItemName(item));
        const insertTo = (arr: ItemType[]) => {
          const a = [...arr];
          a.splice(toIndex ?? a.length, 0, item);
          return a;
        };

        if (from === CONTAINER_TYPES.COLUMN)
          next.columns = removeFrom(prev.columns);
        if (from === CONTAINER_TYPES.ROW) next.rows = removeFrom(prev.rows);
        if (from === CONTAINER_TYPES.METRIC)
          next.metrics = removeFrom(prev.metrics);

        if (to === CONTAINER_TYPES.COLUMN)
          next.columns = insertTo(next.columns);
        if (to === CONTAINER_TYPES.ROW) next.rows = insertTo(next.rows);
        if (to === CONTAINER_TYPES.METRIC)
          next.metrics = insertTo(next.metrics);

        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  const onDropToContainer = useCallback(() => {
    updateDataMaskWith(stateRef.current);
  }, [updateDataMaskWith]);

  const filteredAvailableFields = useMemo(() => {
    const selected = new Set(
      [...state.columns, ...state.rows].map(getItemName),
    );
    return availableFields.filter(f => !selected.has(getItemName(f)));
  }, [availableFields, state.columns, state.rows]);

  const filteredAvailableMetrics = useMemo(() => {
    const selected = new Set(state.metrics.map(getItemName));
    return availableMetrics.filter(m => !selected.has(getItemName(m)));
  }, [availableMetrics, state.metrics]);

  useEffect(() => {
    setState(prev => {
      const next: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'> = {
        columns: isEqual(prev.columns, columns) ? prev.columns : columns,
        rows: isEqual(prev.rows, rows) ? prev.rows : rows,
        metrics: isEqual(prev.metrics, metrics) ? prev.metrics : metrics,
      };
      stateRef.current = next;
      return next;
    });
  }, [columns, rows, metrics]);

  useEffect(() => {
    setState(prev => {
      const fieldsByName = new Map(
        availableFields.map(field => [getItemName(field), field]),
      );
      const metricsByName = new Map(
        availableMetrics.map(metric => [getItemName(metric), metric]),
      );

      const filteredCols = prev.columns
        .map(col => fieldsByName.get(getItemName(col)) || col)
        .filter(col => fieldsByName.has(getItemName(col)));

      const filteredRows = prev.rows
        .map(row => fieldsByName.get(getItemName(row)) || row)
        .filter(row => fieldsByName.has(getItemName(row)));

      const filteredMetrics = prev.metrics
        .map(metric => metricsByName.get(getItemName(metric)) || metric)
        .filter(metric => metricsByName.has(getItemName(metric)));

      const colsChanged = !isEqual(filteredCols, prev.columns);
      const rowsChanged = !isEqual(filteredRows, prev.rows);
      const metricsChanged = !isEqual(filteredMetrics, prev.metrics);

      if (!colsChanged && !rowsChanged && !metricsChanged) {
        return prev;
      }

      const next: Pick<LayoutStateProps, 'columns' | 'rows' | 'metrics'> = {
        columns: filteredCols,
        rows: filteredRows,
        metrics: filteredMetrics,
      };

      stateRef.current = next;
      updateDataMaskWith(next);
      return next;
    });
  }, [availableFields, availableMetrics, updateDataMaskWith]);

  return {
    columns: state.columns,
    rows: state.rows,
    metrics: state.metrics,
    addItem,
    removeItem,
    moveItem,
    onDropToContainer,
    filteredAvailableFields,
    filteredAvailableMetrics,
  };
};
