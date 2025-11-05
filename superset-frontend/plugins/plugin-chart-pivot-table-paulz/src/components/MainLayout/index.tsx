import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider } from 'antd-v5';

import { isEqual } from 'lodash';

import { HandlerFunction, SetDataMaskHook, useTheme } from '@superset-ui/core';
import { ContainerType, ItemType, MetricsLayoutEnum } from '../../types';
import { getItemName } from '../../utils/getItemName';
import { CONTAINER_TYPES, DND_ACCEPT_TYPE } from '../../constants';
import { Content, Layout, Wrapper } from '../../styles';
import { ItemContainer } from './ItemContainer';
import { AggregateSelect } from './AggregateSelect';
import { TransposeButton } from './TransposeButton';

interface MainLayoutProps {
  height: number;
  width: number;
  setControlValue: HandlerFunction;
  setDataMask: SetDataMaskHook;
  availableMetrics: ItemType[];
  metrics: ItemType[];
  availableFields: ItemType[];
  groupbyColumns: ItemType[];
  groupbyRows: ItemType[];
  aggregateFunction: string;
  metricsLayout?: MetricsLayoutEnum;
}

export const MainLayout: FC<MainLayoutProps> = ({
  children,
  height,
  width,
  setControlValue,
  setDataMask,
  availableMetrics,
  metrics,
  availableFields,
  groupbyColumns,
  groupbyRows,
  aggregateFunction,
  metricsLayout,
}) => {
  const theme = useTheme();

  const [localColumns, setLocalColumns] = useState(groupbyColumns);
  const [localRows, setLocalRows] = useState(groupbyRows);
  const [localMetrics, setLocalMetrics] = useState(metrics);

  const localColumnsRef = useRef(localColumns);
  const localRowsRef = useRef(localRows);
  const localMetricsRef = useRef(localMetrics);

  const updateDataMask = useCallback(
    (columns: ItemType[], rows: ItemType[], metrics: ItemType[]) => {
      setControlValue('groupbyColumns', columns);
      setControlValue('groupbyRows', rows);
      setControlValue('metrics', metrics);

      setDataMask?.({
        filterState: {
          value: [...columns, ...rows, ...metrics],
          label: [...columns, ...rows, ...metrics].map(getItemName),
        },
        ownState: {
          refreshKey: Date.now(),
          groupbyColumns: columns,
          groupbyRows: rows,
          metrics,
        },
      });
    },
    [setControlValue, setDataMask],
  );

  const handleAggregateChange = useCallback(
    (value: string) => {
      setControlValue('aggregateFunction', value);

      setDataMask?.({
        filterState: {
          value,
          label: value,
        },
        ownState: {
          refreshKey: Date.now(),
          aggregateFunction: value,
        },
      });
    },
    [setControlValue, setDataMask],
  );

  const handleMetricsLayoutChange = useCallback(() => {
    const value =
      metricsLayout === MetricsLayoutEnum.COLUMNS
        ? MetricsLayoutEnum.ROWS
        : MetricsLayoutEnum.COLUMNS;

    setControlValue('metricsLayout', value);

    setDataMask?.({
      filterState: {
        value,
        label: value,
      },
      ownState: {
        refreshKey: Date.now(),
        metricsLayout: value,
      },
    });
  }, [metricsLayout, setControlValue, setDataMask]);

  const addItem = useCallback((container: ContainerType, items: ItemType[]) => {
    switch (container) {
      case CONTAINER_TYPES.COLUMN:
        setLocalColumns(prev => [...prev, ...items]);
        break;
      case CONTAINER_TYPES.ROW:
        setLocalRows(prev => [...prev, ...items]);
        break;
      case CONTAINER_TYPES.METRIC:
        setLocalMetrics(prev => [...prev, ...items]);
        break;
      default:
        break;
    }
  }, []);

  const setItemContainer = useCallback((container: ContainerType) => {
    switch (container) {
      case CONTAINER_TYPES.COLUMN:
        return setLocalColumns;
      case CONTAINER_TYPES.ROW:
        return setLocalRows;
      case CONTAINER_TYPES.METRIC:
        return setLocalMetrics;
      default:
        return null;
    }
  }, []);

  const moveItem = useCallback(
    (
      fromContainer: ContainerType,
      toContainer: ContainerType,
      item: ItemType,
      toIndex?: number,
    ) => {
      const setFrom = setItemContainer(fromContainer);
      if (setFrom)
        setFrom(prev =>
          prev.filter(prevItem => getItemName(prevItem) !== getItemName(item)),
        );

      const setTo = setItemContainer(toContainer);
      if (setTo)
        setTo(prev => {
          const newArr = [...prev];
          newArr.splice(toIndex ?? newArr.length, 0, item);
          return newArr;
        });
    },
    [setItemContainer],
  );

  const removeItem = useCallback(
    (container: ContainerType, item: ItemType) => {
      switch (container) {
        case CONTAINER_TYPES.COLUMN:
          setLocalColumns(prev => {
            const newCols = prev.filter(
              prevItem => getItemName(prevItem) !== getItemName(item),
            );
            updateDataMask(
              newCols,
              localRowsRef.current,
              localMetricsRef.current,
            );
            return newCols;
          });
          break;
        case CONTAINER_TYPES.ROW:
          setLocalRows(prev => {
            const newRows = prev.filter(
              prevItem => getItemName(prevItem) !== getItemName(item),
            );
            updateDataMask(
              localColumnsRef.current,
              newRows,
              localMetricsRef.current,
            );
            return newRows;
          });
          break;
        case CONTAINER_TYPES.METRIC:
          setLocalMetrics(prev => {
            const newMetrics = prev.filter(
              prevItem => getItemName(prevItem) !== getItemName(item),
            );
            updateDataMask(
              localColumnsRef.current,
              localRowsRef.current,
              newMetrics,
            );
            return newMetrics;
          });
          break;
        default:
          break;
      }
    },
    [updateDataMask],
  );

  const onDropToContainer = useCallback(() => {
    updateDataMask(
      localColumnsRef.current,
      localRowsRef.current,
      localMetricsRef.current,
    );
  }, [updateDataMask]);

  const filteredAvailableFields = useMemo(() => {
    const selected = new Set([...localColumns, ...localRows].map(getItemName));
    return availableFields.filter(field => !selected.has(getItemName(field)));
  }, [availableFields, localColumns, localRows]);

  const filteredAvailableMetrics = useMemo(() => {
    const selected = new Set([...localMetrics].map(getItemName));
    return availableMetrics.filter(
      metric => !selected.has(getItemName(metric)),
    );
  }, [availableMetrics, localMetrics]);

  useEffect(() => {
    setLocalColumns(prev =>
      isEqual(prev, groupbyColumns) ? prev : groupbyColumns,
    );
    setLocalRows(prev => (isEqual(prev, groupbyRows) ? prev : groupbyRows));
    setLocalMetrics(prev => (isEqual(prev, metrics) ? prev : metrics));
  }, [groupbyColumns, groupbyRows, metrics]);

  useEffect(() => {
    localColumnsRef.current = localColumns;
  }, [localColumns]);
  useEffect(() => {
    localRowsRef.current = localRows;
  }, [localRows]);
  useEffect(() => {
    localMetricsRef.current = localMetrics;
  }, [localMetrics]);

  useEffect(() => {
    const availableNames = new Set(availableFields.map(getItemName));
    const availableMetricsName = new Set(availableMetrics.map(getItemName));

    const filteredCols = localColumnsRef.current.filter(col =>
      availableNames.has(getItemName(col)),
    );
    const filteredRows = localRowsRef.current.filter(row =>
      availableNames.has(getItemName(row)),
    );
    const filteredMetrics = localMetricsRef.current.filter(metric =>
      availableMetricsName.has(getItemName(metric)),
    );

    const colsChanged = !isEqual(filteredCols, localColumnsRef.current);
    const rowsChanged = !isEqual(filteredRows, localRowsRef.current);
    const metricsChanged = !isEqual(filteredMetrics, localMetricsRef.current);

    if (colsChanged) {
      setLocalColumns(filteredCols);
    }
    if (rowsChanged) {
      setLocalRows(filteredRows);
    }
    if (metricsChanged) {
      setLocalMetrics(filteredMetrics);
    }

    if (colsChanged || rowsChanged || metricsChanged) {
      updateDataMask(filteredCols, filteredRows, filteredMetrics);
    }
  }, [availableFields, availableMetrics, updateDataMask]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.colors.primary.base,
          colorBgContainer: theme.colors.grayscale.light5,
          colorText: theme.colors.grayscale.dark1,
          controlOutline: theme.colors.primary.dark2,
        },
      }}
    >
      <Wrapper height={height} width={width}>
        <Layout className="main-layout">
          <ItemContainer
            key={`item-container-${CONTAINER_TYPES.METRIC}`}
            style={{ justifyContent: 'flex-start' }}
            containerType={CONTAINER_TYPES.METRIC}
            dndAcceptType={DND_ACCEPT_TYPE.METRIC}
            items={localMetrics}
            filteredAvailableItems={filteredAvailableMetrics}
            moveItem={moveItem}
            onDropToContainer={onDropToContainer}
            addItem={addItem}
            removeItem={removeItem}
          />
          <ItemContainer
            key={`item-container-${CONTAINER_TYPES.COLUMN}`}
            style={{ justifyContent: 'flex-start' }}
            containerType={CONTAINER_TYPES.COLUMN}
            dndAcceptType={DND_ACCEPT_TYPE.FIELD}
            items={localColumns}
            filteredAvailableItems={filteredAvailableFields}
            moveItem={moveItem}
            onDropToContainer={onDropToContainer}
            addItem={addItem}
            removeItem={removeItem}
          />
          <ItemContainer
            key={`item-container-${CONTAINER_TYPES.ROW}`}
            style={{ flexDirection: 'column', justifyContent: 'flex-start' }}
            containerType={CONTAINER_TYPES.ROW}
            dndAcceptType={DND_ACCEPT_TYPE.FIELD}
            items={localRows}
            filteredAvailableItems={filteredAvailableFields}
            moveItem={moveItem}
            onDropToContainer={onDropToContainer}
            addItem={addItem}
            removeItem={removeItem}
          />
          <AggregateSelect
            key="aggregate-select"
            handleAggregateChange={handleAggregateChange}
            aggregateFunction={aggregateFunction}
          />
          <TransposeButton
            key="transpose-button"
            handleMetricsLayoutChange={handleMetricsLayoutChange}
            metricsLayout={metricsLayout}
          />
          <Content key="content">{children}</Content>
        </Layout>
      </Wrapper>
    </ConfigProvider>
  );
};
