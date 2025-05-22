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

export const TYPE_DESCRIPTIONS: Record<string, string> = {
  INT: '32-битное целое число (-2,147,483,648 до 2,147,483,647)',
  BIGINT: '64-битное целое число',
  FLOAT: 'Число с плавающей точкой (32 бита)',
  DOUBLE: 'Число с двойной точностью (64 бита)',
  REAL: 'Число с плавающей точкой (зависит от СУБД)',
  DECIMAL: 'Точное десятичное число (фиксированная точность)',
  VARCHAR: 'Строка переменной длины (до 255 символов)',
  TEXT: 'Текст неограниченной длины',
  CHAR: 'Строка фиксированной длины (1 символ)',
  DATE: 'Дата в формате YYYY-MM-DD',
  TIME: 'Время в формате HH:MM:SS',
  TIMESTAMP: 'Дата и время без временной зоны',
  'TIMESTAMP WITH TIME ZONE': 'Дата и время с временной зоной',
  BOOLEAN: 'Логическое значение (true/false)',
  BYTEA: 'Бинарные данные (PostgreSQL)',
  BLOB: 'Бинарные данные (MySQL)',
  JSON: 'Данные в формате JSON',
  JSONB: 'Бинарное хранение JSON (PostgreSQL)',
  UUID: 'Уникальный идентификатор',
  ARRAY: 'Массив значений (PostgreSQL)',
};
