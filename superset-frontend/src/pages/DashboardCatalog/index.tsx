import { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { t } from '@superset-ui/core';
import { Button, Card, Col, notification, Row, Space, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import SubMenu from '../../features/home/SubMenu';

interface TagType {
  id: number;
  name: string;
}

interface DashboardType {
  id: number;
  dashboard_title: string;
  changed_on: string;
  tags: TagType[];
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

  const groupedDashboards = useMemo(() => {
    const groups: Record<string, DashboardType[]> = {};

    dashboards.forEach(dashboard => {
      if (!dashboard.tags || dashboard.tags.length === 0) {
        if (!groups['Прочие']) groups['Прочие'] = [];
        groups['Прочие'].push(dashboard);
      } else {
        dashboard.tags.forEach(tag => {
          if (!groups[tag.name]) groups[tag.name] = [];
          groups[tag.name].push(dashboard);
        });
      }
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort(
        (a, b) =>
          new Date(b.changed_on).getTime() - new Date(a.changed_on).getTime(),
      );
    });

    return groups;
  }, [dashboards]);

  const sortedGroupEntries = useMemo(() => {
    const entries = Object.entries(groupedDashboards)
      .filter(([name]) => name !== 'Прочие')
      .sort(([a], [b]) => a.localeCompare(b, 'ru'));

    if (groupedDashboards['Прочие']) {
      entries.push(['Прочие', groupedDashboards['Прочие']]);
    }

    return entries;
  }, [groupedDashboards]);

  return (
    <>
      <SubMenu name={t('Каталог')} />
      {loading && <div>Загрузка дэшбордов...</div>}
      {!loading && dashboards.length === 0 && <div>Дэшбордов нет</div>}

      <Row gutter={[8, 8]} style={{ padding: '0 1rem' }}>
        {sortedGroupEntries.map(([groupName, groupDashboards]) => (
          <Col span={8} key={groupName}>
            <Card title={groupName} style={{ height: '100%', width: '100%' }}>
              <Table<DashboardType>
                loading={loading}
                columns={columns}
                dataSource={groupDashboards}
                size="small"
                pagination={false}
                rowKey="id"
                scroll={{ y: 300 }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default DashboardCatalog;
