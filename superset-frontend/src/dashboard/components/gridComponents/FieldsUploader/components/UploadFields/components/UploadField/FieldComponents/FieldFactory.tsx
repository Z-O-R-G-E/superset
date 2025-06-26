import { FC } from 'react';
import { InputText } from './InputText';
import { BaseFieldProps, DataType } from '../../../../../types';

const BaseField: FC<BaseFieldProps> = ({
  size,
  isAutoSize,
  hasCounter,
  rowCount,
  precision,
  scale,
  tooltipContent,
  name,
  type,
  isRequired,
  isMultiple,
  enumValues,
}) => {
  const renderField = () => {
    switch (type) {
      default:
        return (
          <InputText
            name={name}
            isRequired={isRequired}
            type={type}
            tooltipContent={tooltipContent}
            size={size}
            hasCounter={hasCounter}
            isAutoSize={isAutoSize}
            rowCount={rowCount}
            isMultiple={isMultiple}
            enumValues={enumValues}
            precision={precision}
            scale={scale}
          />
        );
    }
  };

  return renderField();
};

export const createField = (type: DataType) => {
  const FieldComponent: FC<BaseFieldProps> = props => (
    <BaseField {...props} type={type} />
  );
  return FieldComponent;
};
