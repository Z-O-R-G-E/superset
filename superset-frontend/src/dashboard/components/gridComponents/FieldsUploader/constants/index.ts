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
  TINYINT:
    'Целое число очень малого размера (1 байт). Диапазон: -128 до 127 или 0 до 255 (UNSIGNED).',
  SMALLINT:
    'Целое число малого размера (2 байта). Диапазон: -32,768 до 32,767 или 0 до 65,535 (UNSIGNED).',
  INT: 'Целое число стандартного размера (4 байта). Диапазон: -2,147,483,648 до 2,147,483,647 или 0 до 4,294,967,295 (UNSIGNED).',
  INTEGER: 'Синоним для INT. Целое число стандартного размера (4 байта).',
  BIGINT:
    'Целое число большого размера (8 байт). Диапазон: -9,223,372,036,854,775,808 до 9,223,372,036,854,775,807 или 0 до 18,446,744,073,709,551,615 (UNSIGNED).',
  FLOAT: 'Число с плавающей запятой одинарной точности (4 байта).',
  DOUBLE: 'Число с плавающей запятой двойной точности (8 байт).',
  REAL: 'Зависит от СУБД: обычно синоним FLOAT или DOUBLE.',
  DECIMAL:
    'Число с фиксированной точностью и масштабом. Пример: DECIMAL(5,2) для чисел типа 123.45, -99.99',
  NUMERIC: 'Синоним DECIMAL. Число с фиксированной точностью.',
  CHAR: 'Строка фиксированной длины (до 255 символов). Заполняется пробелами.',
  VARCHAR:
    'Строка переменной длины (до 65,535 символов в зависимости от СУБД).',
  TEXT: 'Длинная текстовая строка (обычно до 65,535 символов).',
  NCHAR: 'Строка фиксированной длины в Unicode.',
  NVARCHAR: 'Строка переменной длины в Unicode.',
  NTEXT: 'Длинный Unicode-текст (устаревший в некоторых СУБД).',
  BINARY: 'Бинарные данные фиксированной длины.',
  VARBINARY: 'Бинарные данные переменной длины.',
  DATE: 'Дата в формате ГГГГ-ММ-ДД.',
  TIME: 'Время в формате ЧЧ:ММ:СС.',
  DATETIME: 'Дата и время в формате ГГГГ-ММ-ДД ЧЧ:ММ:СС.',
  TIMESTAMP: 'Метка времени (обычно с 1970 года).',
  TIMESTAMPTZ:
    'Метка времени с часовым поясом. Пример: "2025-05-23 14:30:00+03:00"',
  BOOLEAN: 'Логический тип (TRUE/FALSE).',
  BIT: 'Битовое значение (0 или 1).',
  ENUM: "Перечисление (фиксированный набор значений). Пример: ENUM('red', 'green', 'blue')",
  SET: "Набор значений из определенного списка. Пример: SET('a', 'b', 'c')",
  JSON: 'Данные в формате JSON.',
  JSONB:
    'Двоичное представление JSON (в некоторых СУБД, например, PostgreSQL).',
  UUID: 'Уникальный идентификатор (16 байт). Пример: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"',
  ARRAY: 'Массив значений.',
  GEOMETRY: 'Геометрический тип данных (точки, линии и т.д.).',
  POINT: 'Точка в геометрических координатах.',
  LINESTRING: 'Линия из нескольких точек.',
  POLYGON: 'Замкнутая геометрическая фигура.',
  BLOB: 'Бинарные данные большого объема (до 65,535 байт).',
  LONGBLOB: 'Очень большие бинарные данные (до 4 ГБ).',
  MEDIUMBLOB: 'Средние бинарные данные (до 16 МБ).',
  TINYBLOB: 'Маленькие бинарные данные (до 255 байт).',
};

export const SIZE_DEPENDENT_TYPES = [
  'CHAR',
  'VARCHAR',
  'NCHAR',
  'NVARCHAR',
  'BINARY',
  'VARBINARY',
  'BIT',
];
