import { FC } from 'react';
import { BaseFieldProps, DataType } from '../../../../../../types';
import { BaseField } from '../../components';

export const createField = (type: DataType) => {
  const FieldComponent: FC<BaseFieldProps> = props => (
    <BaseField {...props} type={type} />
  );
  return FieldComponent;
};
