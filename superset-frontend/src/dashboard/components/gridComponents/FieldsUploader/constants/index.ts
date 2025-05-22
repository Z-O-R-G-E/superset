export const QueryTypeOptions = [
  {
    value: 'REPLACE',
    label: 'REPLACE',
  },
  {
    value: 'APPEND',
    label: 'APPEND',
  },
];

export const FieldTypeOptions = [
  {
    label: 'Числовые типы',
    options: [
      { value: 'INT', label: 'INT' },
      { value: 'BIGINT', label: 'BIGINT' },
      { value: 'FLOAT', label: 'FLOAT' },
      { value: 'DOUBLE', label: 'DOUBLE' },
      { value: 'REAL', label: 'REAL' },
      { value: 'DECIMAL', label: 'DECIMAL' },
    ],
  },
  {
    label: 'Строковые типы',
    options: [
      { value: 'VARCHAR', label: 'VARCHAR' },
      { value: 'TEXT', label: 'TEXT' },
      { value: 'CHAR', label: 'CHAR' },
    ],
  },
  {
    label: 'Дата и время',
    options: [
      { value: 'DATE', label: 'DATE' },
      { value: 'TIME', label: 'TIME' },
      { value: 'TIMESTAMP', label: 'TIMESTAMP' },
      { value: 'TIMESTAMP WITH TIME ZONE', label: 'TIMESTAMP WITH TIME ZONE' },
    ],
  },
  {
    label: 'Логические и бинарные',
    options: [
      { value: 'BOOLEAN', label: 'BOOLEAN' },
      { value: 'BYTEA', label: 'BYTEA' },
      { value: 'BLOB', label: 'BLOB' },
    ],
  },
  {
    label: 'Специальные типы',
    options: [
      { value: 'JSON', label: 'JSON' },
      { value: 'JSONB', label: 'JSONB' },
      { value: 'UUID', label: 'UUID' },
      { value: 'ARRAY', label: 'ARRAY' },
    ],
  },
];
