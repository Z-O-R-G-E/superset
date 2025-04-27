import { css, styled, SupersetClient, t } from '@superset-ui/core';

import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import { Draggable } from 'src/dashboard/components/dnd/DragDroppable';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import ResizableContainer from 'src/dashboard/components/resizable/ResizableContainer';
import { ROW_TYPE, COLUMN_TYPE } from 'src/dashboard/util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from 'src/dashboard/util/constants';
import { FC, useCallback, useMemo, useState } from 'react';
import { ResizeCallback, ResizeStartCallback } from 're-resizable';
import rison from 'rison';
import { Collapse, Flex } from 'antd-v5';
import { MinusCircleOutlined } from '@ant-design/icons';
import { LayoutItem } from '../../types';
import { AntdForm, AsyncSelect, Col, Row } from '../../../components';
import Button from '../../../components/Button';
import { StyledFormItem } from '../../../features/databases/UploadDataModel/styles';
import { Input } from '../../../components/Input';

interface FieldUploaderProps {
  id: string;
  parentId: string;
  component: LayoutItem;
  parentComponent: LayoutItem;
  getComponentById?: (id?: string) => LayoutItem | undefined;
  index: number;
  depth: number;
  editMode: boolean;

  // grid related
  availableColumnCount: number;
  columnWidth: number;
  onResizeStart: ResizeStartCallback;
  onResize: ResizeCallback;
  onResizeStop: ResizeCallback;

  // dnd
  deleteComponent: (id: string, parentId: string) => void;
  handleComponentDrop: (...args: unknown[]) => unknown;
  updateComponents: Function;
}

interface UploadInfo {
  table_name: string;
  schema: string;
}

const defaultUploadInfo: UploadInfo = {
  table_name: '',
  schema: '',
};

const FieldUploaderStyles = styled.div`
  ${({ theme }) => css`
    &.dashboard-field-uploader {
      overflow: hidden;

      h4,
      h5,
      h6 {
        font-weight: ${theme.typography.weights.normal};
      }

      h5 {
        color: ${theme.colors.grayscale.base};
      }

      h6 {
        font-size: ${theme.typography.sizes.s}px;
      }

      .dashboard-component-chart-holder {
        overflow-y: auto;
        overflow-x: hidden;
      }

      .dashboard--editing & {
        cursor: move;
      }
    }
  `}
`;

const FieldUploader: FC<FieldUploaderProps> = ({
  id,
  parentId,
  component,
  parentComponent,
  index,
  depth,
  availableColumnCount,
  columnWidth,
  onResizeStart,
  onResize,
  onResizeStop,
  editMode,
  getComponentById = () => undefined,
  deleteComponent,
  updateComponents,
  handleComponentDrop,
}) => {
  const [form] = AntdForm.useForm();
  const [currentDatabaseId, setCurrentDatabaseId] = useState<number>(0);
  const [currentSchema, setCurrentSchema] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isFocused, setIsFocused] = useState(false);

  const handleUpdateMeta = useCallback(
    (metaKey: string, nextValue: string | number | undefined) => {
      if (nextValue && component.meta[metaKey] !== nextValue) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              [metaKey]: nextValue,
            },
          },
        });
      }
    },
    [component, updateComponents],
  );

  const handleDeleteComponent = useCallback(() => {
    deleteComponent(id, parentId);
  }, [deleteComponent, id, parentId]);

  const widthMultiple = useMemo(() => {
    const columnParentWidth = getComponentById(
      parentComponent.parents?.find(parent => parent.startsWith(COLUMN_TYPE)),
    )?.meta?.width;

    let widthMultiple = component.meta.width || GRID_MIN_COLUMN_COUNT;
    if (parentComponent.type === COLUMN_TYPE) {
      widthMultiple = parentComponent.meta.width || GRID_MIN_COLUMN_COUNT;
    } else if (columnParentWidth && widthMultiple > columnParentWidth) {
      widthMultiple = columnParentWidth;
    }

    return widthMultiple;
  }, [
    component,
    getComponentById,
    parentComponent.meta.width,
    parentComponent.parents,
    parentComponent.type,
  ]);

  const onChangeDatabase = (database: { value: number; label: string }) => {
    setCurrentDatabaseId(database?.value);
    setCurrentSchema(undefined);
    form.setFieldsValue({ schema: undefined });
    handleUpdateMeta('databaseId', database?.value);
    handleUpdateMeta('shemaId', undefined);
  };

  const onChangeSchema = (schema: { value: string; label: string }) => {
    setCurrentSchema(schema?.value);
    handleUpdateMeta('shemaId', schema?.value);
  };

  const loadDatabaseOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        const query = rison.encode_uri({
          filters: [
            {
              col: 'allow_file_upload',
              opr: 'eq',
              value: true,
            },
          ],
          page,
          page_size: pageSize,
        });
        return SupersetClient.get({
          endpoint: `/api/v1/database/?q=${query}`,
        }).then(response => {
          const list = response.json.result.map(
            (item: { id: number; database_name: string }) => ({
              value: item.id,
              label: item.database_name,
            }),
          );
          return { data: list, totalCount: response.json.count };
        });
      },
    [],
  );

  const loadSchemaOptions = useMemo(
    () =>
      (input = '', page: number, pageSize: number) => {
        if (!currentDatabaseId) {
          return Promise.resolve({ data: [], totalCount: 0 });
        }
        return SupersetClient.get({
          endpoint: `/api/v1/database/${currentDatabaseId}/schemas/`,
        }).then(response => {
          const list = response.json.result.map((item: string) => ({
            value: item,
            label: item,
          }));
          return { data: list, totalCount: response.json.count };
        });
      },
    [currentDatabaseId],
  );

  const onFinish = () => {
    const fields = form.getFieldsValue();
    console.log(fields);
  };

  const validateDatabase = (_: any, value: string) => {
    if (!currentDatabaseId) {
      return Promise.reject(t('Выбор базы данных обязателен'));
    }
    return Promise.resolve();
  };

  return (
    <Draggable
      component={component}
      parentComponent={parentComponent}
      orientation={parentComponent.type === ROW_TYPE ? 'column' : 'row'}
      index={index}
      depth={depth}
      onDrop={handleComponentDrop}
      disableDragDrop={isFocused}
      editMode={editMode}
    >
      {({ dragSourceRef }) => (
        <FieldUploaderStyles
          data-test="dashboard-field-uploader-editor"
          className="dashboard-field-uploader"
          id={component.id}
        >
          <ResizableContainer
            id={component.id}
            adjustableWidth={parentComponent.type === ROW_TYPE}
            adjustableHeight
            widthStep={columnWidth}
            widthMultiple={widthMultiple}
            heightStep={GRID_BASE_UNIT}
            heightMultiple={component.meta.height}
            minWidthMultiple={GRID_MIN_COLUMN_COUNT}
            minHeightMultiple={GRID_MIN_ROW_UNITS}
            maxWidthMultiple={availableColumnCount + widthMultiple}
            onResizeStart={onResizeStart}
            onResize={onResize}
            onResizeStop={onResizeStop}
            editMode={!isFocused ? editMode : false}
          >
            <div
              ref={dragSourceRef}
              className="dashboard-component dashboard-component-chart-holder"
              data-test="dashboard-component-chart-holder"
            >
              {editMode && (
                <HoverMenu position="top">
                  <div data-test="dashboard-delete-component-button">
                    <DeleteComponentButton onDelete={handleDeleteComponent} />
                  </div>
                </HoverMenu>
              )}
              <AntdForm
                form={form}
                onFinish={onFinish}
                data-test="dashboard-edit-properties-form"
                layout="vertical"
                initialValues={defaultUploadInfo}
              >
                <Row gutter={[0, 8]} justify="center" align="top">
                  {editMode && (
                    <Col span={24}>
                      <Collapse
                        expandIconPosition="end"
                        items={[
                          {
                            key: '1',
                            label: 'Настройка базы данных',
                            children: (
                              <Row
                                gutter={8}
                                justify="space-around"
                                align="top"
                              >
                                <Col flex="0 1 300px">
                                  <StyledFormItem
                                    label={t('База данных')}
                                    required
                                    name="database"
                                    rules={[{ validator: validateDatabase }]}
                                  >
                                    <AsyncSelect
                                      ariaLabel={t('Выберите базу данных')}
                                      options={loadDatabaseOptions}
                                      onChange={onChangeDatabase}
                                      allowClear
                                      placeholder={t('Выбрать...')}
                                    />
                                  </StyledFormItem>
                                </Col>
                                <Col flex="0 1 300px">
                                  <StyledFormItem
                                    label={t('Схема')}
                                    name="schema"
                                  >
                                    <AsyncSelect
                                      ariaLabel={t('Выберите схему')}
                                      options={loadSchemaOptions}
                                      onChange={onChangeSchema}
                                      allowClear
                                      placeholder={t('Выбрать...')}
                                    />
                                  </StyledFormItem>
                                </Col>
                                <Col flex="1 1 300px">
                                  <StyledFormItem
                                    label={t('Название таблицы')}
                                    name="table_name"
                                    required
                                    rules={[
                                      {
                                        required: true,
                                        message: 'Название таблицы обязательно',
                                      },
                                    ]}
                                  >
                                    <Input
                                      aria-label={t('Название таблицы')}
                                      name="table_name"
                                      data-test="properties-modal-name-input"
                                      type="text"
                                      allowClear
                                      onChange={e => {
                                        handleUpdateMeta(
                                          'tableName',
                                          e.target.value,
                                        );
                                      }}
                                      placeholder={t(
                                        'Имя таблицы которая будет создана',
                                      )}
                                    />
                                  </StyledFormItem>
                                </Col>
                              </Row>
                            ),
                          },
                        ]}
                        defaultActiveKey={['1']}
                      />
                    </Col>
                  )}
                  <Col span={24}>
                    <AntdForm.List name="fields">
                      {(fields, { add, remove }, { errors }) => (
                        <Flex
                          gap="small"
                          vertical
                          align="center"
                          justify="start"
                        >
                          {editMode && (
                            <StyledFormItem name="add_field">
                              <Button
                                onClick={() => add()}
                                aria-label={t('Добавить поле')}
                              >
                                {t('Добавить поле')}
                              </Button>
                              <AntdForm.ErrorList errors={errors} />
                            </StyledFormItem>
                          )}
                          <Row>
                            {fields.map((field, index) => (
                              <Col>
                                <StyledFormItem
                                  required={false}
                                  key={field.key}
                                >
                                  <StyledFormItem
                                    {...field}
                                    validateTrigger={['onChange', 'onBlur']}
                                    rules={[
                                      {
                                        required: true,
                                        whitespace: true,
                                        message:
                                          'Введите значение или удалите поле',
                                      },
                                    ]}
                                    noStyle
                                  >
                                    <Input style={{ width: '60%' }} />
                                  </StyledFormItem>
                                  <MinusCircleOutlined
                                    className="dynamic-delete-button"
                                    onClick={() => remove(field.name)}
                                  />
                                </StyledFormItem>
                              </Col>
                            ))}
                          </Row>
                        </Flex>
                      )}
                    </AntdForm.List>
                  </Col>
                </Row>
              </AntdForm>
            </div>
          </ResizableContainer>
        </FieldUploaderStyles>
      )}
    </Draggable>
  );
};

export default FieldUploader;
