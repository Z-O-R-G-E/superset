import { FC } from 'react';
import { Divider } from 'antd';
import { useUploadInfoField } from '../../contexts/UploadInfoContext';

export const Header: FC = () => {
  const database = useUploadInfoField('database');
  const schema = useUploadInfoField('schema');
  const table = useUploadInfoField('table');

  return (
    <>
      <Divider style={{ margin: 0 }} orientation="left">
        Хранилище данных
      </Divider>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <b>База:</b> {database ? database?.label : 'Не выбрана'}
        </span>
        {schema && (
          <span>
            <b>Схема:</b> {schema?.label}
          </span>
        )}
        <span>
          <b>Таблица:</b> {table.length > 0 ? table : 'Не указана'}
        </span>
      </div>
    </>
  );
};
