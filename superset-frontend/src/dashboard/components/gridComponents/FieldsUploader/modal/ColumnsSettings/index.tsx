import {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { t } from '@superset-ui/core';
import { Form, Modal } from 'antd';
import { ColumnsSettingsType } from '../../types';
import {
  useColumnsSettings,
  useUpdateColumnsSettings,
} from '../../contexts/ColumnsSettingsContext';

interface ColumnSettingsProps {
  isColumnsSettingsOpen: boolean;
  setIsColumnsSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

export const ColumnsSettings: FC<ColumnSettingsProps> = ({
  isColumnsSettingsOpen,
  setIsColumnsSettingsOpen,
}) => {
  const [form] = Form.useForm();
  const { dayFirst, nullValues, dataframeIndex, indexColumn, indexLabel } =
    useColumnsSettings();
  const updateColumnsSettings = useUpdateColumnsSettings();
  const [isDataframeIndex, setIsDataframeIndex] = useState<boolean>();

  const onClose = useCallback(() => {
    setIsColumnsSettingsOpen(false);
  }, [setIsColumnsSettingsOpen]);

  const handleSubmit = useCallback(
    (values: ColumnsSettingsType) => {
      updateColumnsSettings(values);
      onClose();
    },
    [onClose, updateColumnsSettings],
  );

  useEffect(() => {
    if (isColumnsSettingsOpen) {
      setIsDataframeIndex(dataframeIndex);
      form.setFieldsValue({
        dayFirst,
        nullValues,
        dataframeIndex,
        indexColumn,
        indexLabel,
      });
    }
  }, [
    form,
    isColumnsSettingsOpen,
    dataframeIndex,
    dayFirst,
    nullValues,
    indexColumn,
    indexLabel,
  ]);

  return (
    <Modal
      title={t('Настройки колонок')}
      visible={isColumnsSettingsOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      cancelText={t('Отмена')}
      okText={t('Подтвердить')}
      centered
      destroyOnClose
      width={700}
      data-test="columns-settings-modal"
    >
      <Form
        name="columnsSettingsForm"
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      />
    </Modal>
  );
};
