import { Row } from 'antd-v5';
import { FC, memo } from 'react';
import { UploadFieldType } from '../../../../types';
import { UploadField } from '../UploadField';

interface FieldsListProps {
  fields: UploadFieldType[];
  onEdit: (index: number) => void;
}

export const FieldsList: FC<FieldsListProps> = memo(({ fields, onEdit }) => (
  <Row justify="center" gutter={[16, 16]} style={{ marginBottom: 16 }}>
    {fields.map((field, index) => (
      <UploadField
        key={`${field.name}-${index}`}
        index={index}
        fieldConfig={{
          index: field.index,
          name: field.name,
          isRequired: field.isRequired,
          type: field.type,
        }}
        formatOptions={{
          precision: field.precision,
          scale: field.scale,
          size: field.size,
          enumValues: field.enumValues,
        }}
        layoutOptions={{
          width: field.width,
          isAutoSize: field.isAutoSize,
          rowCount: field.rowCount,
          hasCounter: field.hasCounter,
          isMultiple: field.isMultiple,
          description: field.description,
          hasDescription: field.hasDescription,
          isField: field.isField,
        }}
        onEdit={onEdit}
      />
    ))}
  </Row>
));
