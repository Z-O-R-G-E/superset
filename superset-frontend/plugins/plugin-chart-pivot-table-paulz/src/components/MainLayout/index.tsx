import { FC, useCallback } from 'react';
import { ConfigProvider } from 'antd-v5';

import { HandlerFunction, SetDataMaskHook, useTheme } from '@superset-ui/core';
import { ItemType, MetricsLayoutEnum } from '../../types';
import { CONTAINER_TYPES, DND_ACCEPT_TYPE } from '../../constants';
import { Content, Layout, Wrapper } from '../../styles';
import { ItemContainer } from './ItemContainer';
import { AggregateSelect } from './AggregateSelect';
import { TransposeButton } from './TransposeButton';
import { useLayoutState } from '../../hooks/useLayoutState';

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
  groupbyColumns: columns,
  groupbyRows: rows,
  aggregateFunction,
  metricsLayout,
}) => {
  const theme = useTheme();

  const {
    columns: localColumns,
    rows: localRows,
    metrics: localMetrics,
    addItem,
    removeItem,
    moveItem,
    onDropToContainer,
    filteredAvailableFields,
    filteredAvailableMetrics,
  } = useLayoutState({
    columns,
    rows,
    metrics,
    availableFields,
    availableMetrics,
    setControlValue,
    setDataMask,
  });

  const handleAggregateChange = useCallback(
    (value: string) => {
      setControlValue('aggregateFunction', value);
      setDataMask?.({
        filterState: { value, label: value },
        ownState: { refreshKey: Date.now(), aggregateFunction: value },
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
      filterState: { value, label: value },
      ownState: { refreshKey: Date.now(), metricsLayout: value },
    });
  }, [metricsLayout, setControlValue, setDataMask]);

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
