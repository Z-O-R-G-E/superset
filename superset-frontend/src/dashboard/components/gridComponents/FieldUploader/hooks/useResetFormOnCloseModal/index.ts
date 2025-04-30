import { GetRef } from 'antd-v5';
import { useEffect, useRef } from 'react';
import { AntdForm } from '../../../../../../components';

type FormInstance = GetRef<typeof AntdForm>;

export const useResetFormOnCloseModal = ({
  form,
  open,
}: {
  form: FormInstance;
  open: boolean;
}) => {
  const prevOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open && prevOpenRef.current) {
      form.resetFields();
    }
  }, [form, open]);
};
