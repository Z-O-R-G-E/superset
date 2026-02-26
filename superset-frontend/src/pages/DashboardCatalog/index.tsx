import { FC, useEffect, useState, useCallback } from 'react';
import { t } from '@superset-ui/core';
import { Button, Card, Col, notification, Row, Space, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import SubMenu from '../../features/home/SubMenu';

interface DashboardType {
  id: number;
  dashboard_title: string;
  has_access: boolean;
}

const DashboardCatalog: FC = () => {
  const [dashboards, setDashboards] = useState<DashboardType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/dashboard_catalog/list`);
      const data: DashboardType[] = await res.json();
      setDashboards(data);
    } catch (err) {
      notification.error({
        message: 'Ошибка при загрузке каталога дэшбордов:',
        description: err,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const columns: ColumnsType<DashboardType> = [
    {
      title: 'Название',
      dataIndex: 'dashboard_title',
      key: 'dashboard_title',
      ellipsis: true,
    },
    {
      title: 'Изменено',
      dataIndex: 'date',
      key: 'date',
      width: 100,
    },
    {
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" style={{ width: '100%' }} align="center">
          {record.has_access ? (
            <Button type="primary" size="small" ghost>
              Открыть
            </Button>
          ) : (
            <Button type="primary" size="small" danger ghost>
              Запросить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <SubMenu name={t('Каталог')} />
      {loading && <div>Загрузка дэшбордов...</div>}
      {!loading && dashboards.length === 0 && <div>Дэшбордов нет</div>}
      <Row gutter={16} style={{ padding: '0 1rem' }}>
        <Col span={8}>
          <Card title="Group name" style={{ width: '100%' }}>
            <Table<DashboardType>
              loading={loading}
              columns={columns}
              dataSource={dashboards}
              size="small"
              showHeader={false}
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardCatalog;
