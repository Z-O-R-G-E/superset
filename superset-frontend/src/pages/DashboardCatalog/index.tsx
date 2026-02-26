import { FC, useEffect, useState, useCallback } from 'react';
import { t } from '@superset-ui/core';
import { Button, Card, Col, notification, Row, Space, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import SubMenu from '../../features/home/SubMenu';

interface TagType {
  id: number;
  name: string;
  type: string;
}

interface DashboardType {
  id: number;
  dashboard_title: string;
  changed_on: string;
  tags: TagType[];
  has_access: boolean;
}

interface DataType {
  dashboards: DashboardType[];
  tags: TagType[];
}

const DashboardCatalog: FC = () => {
  const [dashboards, setDashboards] = useState<DashboardType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/dashboard_catalog/list`);
      const data: DataType = await res.json();
      setDashboards(data.dashboards);
      setTags(data.tags);
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
      title: 'Обновлено',
      dataIndex: 'changed_on',
      key: 'changed_on',
      width: 150,
      render: (text: string) => {
        if (!text) return '';
        const date = new Date(text);
        return date
          .toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          .replace(',', '');
      },
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
