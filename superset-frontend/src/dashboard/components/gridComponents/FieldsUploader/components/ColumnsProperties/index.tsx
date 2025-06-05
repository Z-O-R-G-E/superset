import { FC, useState, useMemo } from 'react';
import { Button, Col, Divider, Row, Space } from 'antd';
import { t } from '@superset-ui/core';
import { useColumnsSettings } from '../../contexts/ColumnsSettingsContext';
import { StatusItem } from '../StatusItem';
import { ColumnsSettings } from '../../modal/ColumnsSettings';

export const ColumnsProperties: FC = () => {
  const [isColumnsSettingsOpen, setIsColumnsSettingsOpen] = useState(false);
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();

  const statusItems = useMemo(
    () => [
      {
        label: t('Формат даты'),
        value: true,
        successContent: dayFirst ? 'ДД-ММ-ГГГГ' : 'ГГГГ-ММ-ДД',
        tooltip: 'Можно изменить формат даты нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: true,
      },
      {
        label: t('NULL значения'),
        value: nullValues.length > 0 ? nullValues : undefined,
        successContent: nullValues,
        tooltip:
          'Можно изменить что будет считаться NULL нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: true,
      },
      {
        label: t('Создать индекс'),
        value: true,
        successContent: dataframeIndex ? 'Создать' : 'Не создавать',
        tooltip: 'Можно изменить нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: true,
      },
      {
        label: t('Колонка-индекс'),
        value: indexColumn,
        successContent: indexColumn,
        tooltip:
          'Можно изменить колонку-индекс, которая будет считаться индексом нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: dataframeIndex,
      },
      {
        label: t('Индексная метка'),
        value: indexLabel,
        successContent: indexLabel,
        tooltip: 'Можно изменить индексную метку нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: dataframeIndex,
      },
    ],
    [dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider orientation="left" style={{ margin: 0 }}>
        {t('Колонки')}
      </Divider>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          rowGap: '16px',
          justifyContent: 'space-around',
        }}
      >
        {statusItems.map((item, index) => (
          <StatusItem {...item} />
        ))}
      </div>

      <Row>
        <Col
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Button
            style={{
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: '3rem',
            }}
            onClick={() => setIsColumnsSettingsOpen(true)}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t('Редактировать')}
            </span>
          </Button>
        </Col>
      </Row>

      <ColumnsSettings
        isColumnsSettingsOpen={isColumnsSettingsOpen}
        setIsColumnsSettingsOpen={setIsColumnsSettingsOpen}
      />
    </Space>
  );
};
