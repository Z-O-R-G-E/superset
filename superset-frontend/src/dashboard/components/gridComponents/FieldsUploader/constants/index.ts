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
      { value: 'TINYINT', label: 'TINYINT' },
      { value: 'SMALLINT', label: 'SMALLINT' },
      { value: 'INT', label: 'INT' },
      { value: 'INTEGER', label: 'INTEGER' },
      { value: 'BIGINT', label: 'BIGINT' },
      { value: 'FLOAT', label: 'FLOAT' },
      { value: 'DOUBLE', label: 'DOUBLE' },
      { value: 'REAL', label: 'REAL' },
      { value: 'DECIMAL', label: 'DECIMAL' },
      { value: 'NUMERIC', label: 'NUMERIC' },
    ],
  },
  {
    label: 'Строковые типы',
    options: [
      { value: 'CHAR', label: 'CHAR' },
      { value: 'VARCHAR', label: 'VARCHAR' },
      { value: 'TEXT', label: 'TEXT' },
      { value: 'NCHAR', label: 'NCHAR' },
      { value: 'NVARCHAR', label: 'NVARCHAR' },
      { value: 'NTEXT', label: 'NTEXT' },
    ],
  },
  {
    label: 'Бинарные типы',
    options: [
      { value: 'BINARY', label: 'BINARY' },
      { value: 'VARBINARY', label: 'VARBINARY' },
      { value: 'BLOB', label: 'BLOB' },
      { value: 'TINYBLOB', label: 'TINYBLOB' },
      { value: 'MEDIUMBLOB', label: 'MEDIUMBLOB' },
      { value: 'LONGBLOB', label: 'LONGBLOB' },
      { value: 'BYTEA', label: 'BYTEA' },
    ],
  },
  {
    label: 'Дата и время',
    options: [
      { value: 'DATE', label: 'DATE' },
      { value: 'TIME', label: 'TIME' },
      { value: 'DATETIME', label: 'DATETIME' },
      { value: 'TIMESTAMP', label: 'TIMESTAMP' },
      { value: 'TIMESTAMPTZ', label: 'TIMESTAMPTZ' },
    ],
  },
  {
    label: 'Логические и битовые',
    options: [
      { value: 'BOOLEAN', label: 'BOOLEAN' },
      { value: 'BIT', label: 'BIT' },
    ],
  },
  {
    label: 'JSON и XML',
    options: [
      { value: 'JSON', label: 'JSON' },
      { value: 'JSONB', label: 'JSONB' },
    ],
  },
  {
    label: 'Уникальные идентификаторы',
    options: [{ value: 'UUID', label: 'UUID' }],
  },
  {
    label: 'Перечисления и множества',
    options: [
      { value: 'ENUM', label: 'ENUM' },
      { value: 'SET', label: 'SET' },
    ],
  },
  {
    label: 'Массивы',
    options: [{ value: 'ARRAY', label: 'ARRAY' }],
  },
  {
    label: 'Геометрические типы',
    options: [
      { value: 'GEOMETRY', label: 'GEOMETRY' },
      { value: 'POINT', label: 'POINT' },
      { value: 'LINESTRING', label: 'LINESTRING' },
      { value: 'POLYGON', label: 'POLYGON' },
    ],
  },
];

export const TYPE_DESCRIPTIONS: Record<string, string> = {
  TINYINT: '1 байт (-128..127) - Пример: 42, -10, 127',
  SMALLINT: '2 байта (-32,768..32,767) - Пример: 15000, -20000, 32767',
  INT: '4 байта (-2,147,483,648..2,147,483,647) - Пример: 2000000, -1000000, 2147483647',
  INTEGER: 'Синоним INT - Пример: 100500, -500100',
  BIGINT:
    '8 байт (±9.2 квинтиллиона) - Пример: 9223372036854775807, -9223372036854775808',
  FLOAT: '4 байта (~7 знаков) - Пример: 3.14159, -123.456, 1.234567e+10',
  DOUBLE: '8 байт (~15 знаков) - Пример: 3.141592653589793, -2.718281828459045',
  REAL: 'Синоним FLOAT - Пример: 123.456, 0.00001',
  DECIMAL:
    'Точное число (p, s) - Пример: 12345.67 (DECIMAL(7,2)), 0.0001 (DECIMAL(5,4))',
  NUMERIC: 'Синоним DECIMAL - Пример: 9999.99 (NUMERIC(6,2))',
  CHAR: 'Фиксированная строка (n) - Пример: "A" (CHAR(1)), "YES" (CHAR(3))',
  VARCHAR:
    'Строка переменной длины (n) - Пример: "hello" (VARCHAR(255)), "SQL" (VARCHAR(10))',
  TEXT: 'Длинный текст - Пример: "Это длинный текст..." (до 1GB)',
  NCHAR: 'Unicode CHAR (n) - Пример: "文" (NCHAR(1)), "测试" (NCHAR(2))',
  NVARCHAR: 'Unicode VARCHAR (n) - Пример: "こんにちは" (NVARCHAR(20))',
  NTEXT: 'Unicode TEXT - Пример: "长篇Unicode文本..." (неограниченная длина)',
  BINARY:
    'Бинарные данные фиксированной длины (n) - Пример: 0x4A6F686E (BINARY(4))',
  VARBINARY:
    'Бинарные данные переменной длины (n) - Пример: 0xFFD8FFE0 (VARBINARY(MAX))',
  BLOB: 'Бинарные данные - Пример: изображение JPEG, PDF-документ',
  TINYBLOB: 'Маленькие бинарные данные - Пример: 0x01A2 (до 255 байт)',
  MEDIUMBLOB:
    'Средние бинарные данные - Пример: небольшие изображения (до 16MB)',
  LONGBLOB: 'Большие бинарные данные - Пример: видеофайлы (до 4GB)',
  DATE: 'Дата (YYYY-MM-DD) - Пример: "2023-12-31", "1999-01-01"',
  TIME: 'Время (HH:MM:SS) - Пример: "23:59:59", "00:00:00.123"',
  DATETIME:
    'Дата + время - Пример: "2023-12-31 23:59:59", "1999-01-01 00:00:00"',
  TIMESTAMP: 'UNIX-время - Пример: 1672531199 (2023-01-01 00:00:00 UTC)',
  TIMESTAMPTZ:
    'Метка времени с часовым поясом - Пример: "2023-01-01 00:00:00+03"',
  BOOLEAN: 'Логический тип - Пример: true, false, 1, 0',
  BIT: 'Битовое поле (n) - Пример: 1 (BIT(1)), 101 (BIT(3))',
  ENUM: 'Перечисление - Пример: "red" (ENUM("red","green","blue"))',
  SET: 'Множество значений - Пример: "red,blue" (SET("red","green","blue"))',
  JSON: 'JSON-строка - Пример: {"name":"John","age":30}',
  JSONB:
    'Бинарный JSON - Пример: {"id":1,"active":true} (оптимизированное хранение)',
  UUID: 'Уникальный идентификатор - Пример: "123e4567-e89b-12d3-a456-426614174000"',
  ARRAY: 'Массив - Пример: {1,2,3} (PostgreSQL), [1,2,3] (другие СУБД)',
  GEOMETRY:
    'Геометрические данные - Пример: "POINT(10 20)", "LINESTRING(0 0, 10 10)"',
  POINT: 'Точка - Пример: "POINT(30 10)"',
  LINESTRING: 'Линия - Пример: "LINESTRING(0 0, 10 10, 20 25)"',
  POLYGON: 'Полигон - Пример: "POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))"',
};
