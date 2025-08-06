import { FC, useState, useMemo } from 'react';
import { Button, Col, Row, Space, Typography } from 'antd-v5';
import { t } from '@superset-ui/core';
import { useColumnsSettings } from '../../contexts/ColumnsSettingsContext';
import { StatusItem } from '../StatusItem';
import { ColumnsSettings } from '../../modal';

export const ColumnsProperties: FC = () => {
  const [isColumnsSettingsOpen, setIsColumnsSettingsOpen] = useState(false);
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();

  const indexLogic = useMemo(() => {
    if (!dataframeIndex) return 'Отсутствует';

    if (indexLabel) {
      return indexColumn
        ? `${indexLabel} (значение поля ${indexColumn})`
        : `${indexLabel} (порядковый)`;
    }

    return indexColumn
      ? `${indexColumn} (значение поля ${indexColumn})`
      : 'id (порядковый)';
  }, [dataframeIndex, indexLabel, indexColumn]);

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
        value: nullValues?.length > 0,
        successContent: nullValues
          ?.map(value => (value === '' ? '""' : value))
          .join(', '),
        tooltip:
          'Можно изменить что будет считаться NULL нажав кнопку "Редактировать"',
        errorType: 'success' as const,
        show: true,
      },
      {
        label: t('Индекс'),
        value: true,
        successContent: indexLogic,
        tooltip: 'Можно редактировать нажав кнопку "Редактировать"',
        errorType: 'warning' as const,
        show: true,
      },
    ],
    [dayFirst, nullValues, indexLogic],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
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
          <StatusItem key={index} {...item} />
        ))}
      </div>

      <Row>
        <Col
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Button
            htmlType="button"
            aria-label={t('Редактировать')}
            style={{ minWidth: '3rem' }}
            onClick={() => setIsColumnsSettingsOpen(true)}
          >
            <Typography.Text style={{ color: 'inherit' }} ellipsis>
              {t('Редактировать')}
            </Typography.Text>
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
