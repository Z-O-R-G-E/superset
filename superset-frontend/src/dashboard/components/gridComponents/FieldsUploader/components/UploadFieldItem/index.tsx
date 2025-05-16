import { FC, memo } from 'react';
import { Col, Form, Input, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { t } from '@superset-ui/core';

interface UploadFieldItemProps {
  index: number;
  name: string;
  type: string;
  width?: number;
  editMode: boolean;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}

const UploadFieldItem: FC<UploadFieldItemProps> = memo(
  ({ index, name, type, editMode, onRemove, onEdit }) => (
    <Col key={`${name}-${index}`}>
      <Space size={5} align="center">
        <Form.Item label={name}>
          <Input
            placeholder={type}
            disabled={editMode}
            style={{ width: '100%' }}
          />
        </Form.Item>
        {editMode && (
          <Space direction="vertical" size={3}>
            <EditOutlined
              onClick={() => onEdit(index)}
              aria-label={t('Редактировать поле')}
            />
            <DeleteOutlined
              onClick={() => onRemove(index)}
              aria-label={t('Удалить поле')}
            />
          </Space>
        )}
      </Space>
    </Col>
  ),
);

export default UploadFieldItem;
