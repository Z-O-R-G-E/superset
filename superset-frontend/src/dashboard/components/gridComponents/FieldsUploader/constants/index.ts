import { SubdType } from '../types';

export const AlreadyExistsOptions = [
  {
    value: 'replace',
    label: 'REPLACE',
  },
  {
    value: 'append',
    label: 'APPEND',
  },
];

export const SubdTypeOptions = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'Microsoft SQL Server' },
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'oracle', label: 'Oracle Database' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'elasticsearch', label: 'Elasticsearch' },
];

export interface FieldTypeOption {
  value: string;
  label: string;
  supportedDBs: SubdType[];
}

export interface FieldTypeGroup {
  label: string;
  options: FieldTypeOption[];
}

export const FieldTypeOptions: FieldTypeGroup[] = [
  {
    label: 'Числовые типы',
    options: [
      {
        value: 'TINYINT',
        label: 'TINYINT',
        supportedDBs: ['mysql', 'mssql', 'mariadb'],
      },
      {
        value: 'SMALLINT',
        label: 'SMALLINT',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'INT',
        label: 'INT / INTEGER',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'BIGINT',
        label: 'BIGINT',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'FLOAT32',
        label: 'FLOAT32',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'FLOAT',
        label: 'FLOAT',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'FLOAT64',
        label: 'FLOAT64',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'DOUBLE',
        label: 'DOUBLE',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'DECIMAL',
        label: 'DECIMAL / NUMERIC',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      { value: 'NUMBER', label: 'NUMBER', supportedDBs: ['oracle'] },
      {
        value: 'BINARY_FLOAT',
        label: 'BINARY_FLOAT',
        supportedDBs: ['oracle'],
      },
      {
        value: 'BINARY_DOUBLE',
        label: 'BINARY_DOUBLE',
        supportedDBs: ['oracle'],
      },
    ],
  },
  {
    label: 'Строковые типы',
    options: [
      {
        value: 'FIXEDSTRING',
        label: 'FIXEDSTRING',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'CHAR',
        label: 'CHAR',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'STRING',
        label: 'STRING',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'VARCHAR',
        label: 'VARCHAR',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'TEXT',
        label: 'TEXT',
        supportedDBs: ['postgresql', 'mysql', 'mssql', 'sqlite', 'mariadb'],
      },
      {
        value: 'NCHAR',
        label: 'NCHAR',
        supportedDBs: ['mssql', 'oracle'],
      },
      {
        value: 'NVARCHAR',
        label: 'NVARCHAR',
        supportedDBs: ['mssql', 'oracle'],
      },
      {
        value: 'CLOB',
        label: 'CLOB',
        supportedDBs: ['oracle', 'postgresql'],
      },
      {
        value: 'LONGTEXT',
        label: 'LONGTEXT',
        supportedDBs: ['mysql', 'mariadb'],
      },
      {
        value: 'STRING',
        label: 'STRING',
        supportedDBs: ['mongodb', 'elasticsearch'],
      },
    ],
  },
  {
    label: 'Бинарные типы',
    options: [
      {
        value: 'BINARY',
        label: 'BINARY',
        supportedDBs: ['mysql', 'mssql', 'mariadb'],
      },
      {
        value: 'VARBINARY',
        label: 'VARBINARY',
        supportedDBs: ['mysql', 'mssql', 'postgresql', 'mariadb'],
      },
      {
        value: 'BLOB',
        label: 'BLOB',
        supportedDBs: ['mysql', 'oracle', 'sqlite', 'mariadb'],
      },
      {
        value: 'BYTEA',
        label: 'BYTEA',
        supportedDBs: ['postgresql'],
      },
      { value: 'RAW', label: 'RAW', supportedDBs: ['oracle'] },
      {
        value: 'BINARY_JSON',
        label: 'BINARY_JSON',
        supportedDBs: ['mongodb'],
      },
    ],
  },
  {
    label: 'Дата и время',
    options: [
      {
        value: 'DATE',
        label: 'DATE',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'TIME',
        label: 'TIME',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'DATETIME',
        label: 'DATETIME',
        supportedDBs: ['mysql', 'mssql', 'clickhouse', 'sqlite', 'mariadb'],
      },
      {
        value: 'TIMESTAMP',
        label: 'TIMESTAMP',
        supportedDBs: [
          'postgresql',
          'mysql',
          'mssql',
          'clickhouse',
          'oracle',
          'sqlite',
          'mariadb',
        ],
      },
      {
        value: 'DATETIME64',
        label: 'DATETIME64',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'TIMESTAMPTZ',
        label: 'TIMESTAMPTZ',
        supportedDBs: ['postgresql'],
      },
      {
        value: 'INTERVAL',
        label: 'INTERVAL',
        supportedDBs: ['oracle', 'postgresql'],
      },
    ],
  },
  {
    label: 'Логические типы',
    options: [
      {
        value: 'UINT8',
        label: 'UINT8',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'BOOLEAN',
        label: 'BOOLEAN',
        supportedDBs: ['postgresql', 'mysql', 'sqlite', 'mariadb'],
      },
      { value: 'BIT', label: 'BIT', supportedDBs: ['mssql'] },
      { value: 'BOOL', label: 'BOOL', supportedDBs: ['sqlite'] },
    ],
  },
  {
    label: 'JSON и специализированные',
    options: [
      {
        value: 'JSON',
        label: 'JSON',
        supportedDBs: [
          'postgresql',
          'mysql',
          'clickhouse',
          'sqlite',
          'mariadb',
          'mongodb',
        ],
      },
      {
        value: 'JSONB',
        label: 'JSONB',
        supportedDBs: ['postgresql'],
      },
      {
        value: 'UUID',
        label: 'UUID',
        supportedDBs: ['postgresql', 'clickhouse'],
      },
      {
        value: 'XML',
        label: 'XML',
        supportedDBs: ['mssql', 'postgresql'],
      },
      { value: 'BSON', label: 'BSON', supportedDBs: ['mongodb'] },
    ],
  },
  {
    label: 'Геометрические типы',
    options: [
      {
        value: 'GEOMETRY',
        label: 'GEOMETRY',
        supportedDBs: ['postgresql', 'mysql', 'mariadb'],
      },
      {
        value: 'POINT',
        label: 'POINT',
        supportedDBs: ['postgresql', 'mysql', 'clickhouse', 'mariadb'],
      },
      {
        value: 'LINESTRING',
        label: 'LINESTRING',
        supportedDBs: ['postgresql', 'mysql', 'clickhouse', 'mariadb'],
      },
      {
        value: 'POLYGON',
        label: 'POLYGON',
        supportedDBs: ['postgresql', 'mysql', 'clickhouse', 'mariadb'],
      },
      {
        value: 'GEOJSON',
        label: 'GEOJSON',
        supportedDBs: ['mongodb', 'elasticsearch'],
      },
    ],
  },
  {
    label: 'Массивы и составные',
    options: [
      {
        value: 'ARRAY',
        label: 'ARRAY',
        supportedDBs: ['postgresql', 'clickhouse'],
      },
      {
        value: 'ENUM',
        label: 'ENUM',
        supportedDBs: ['mysql', 'mariadb'],
      },
      {
        value: 'SET',
        label: 'SET',
        supportedDBs: ['mysql', 'mariadb'],
      },
      {
        value: 'NESTED',
        label: 'NESTED',
        supportedDBs: ['elasticsearch'],
      },
    ],
  },
  {
    label: 'ClickHouse-специфичные',
    options: [
      {
        value: 'LowCardinality(String)',
        label: 'LowCardinality(String)',
        supportedDBs: ['clickhouse'],
      },
      {
        value: 'Nullable(T)',
        label: 'Nullable(T)',
        supportedDBs: ['clickhouse'],
      },
      { value: 'IPv4', label: 'IPv4', supportedDBs: ['clickhouse'] },
      { value: 'IPv6', label: 'IPv6', supportedDBs: ['clickhouse'] },
      {
        value: 'AggregateFunction',
        label: 'AggregateFunction',
        supportedDBs: ['clickhouse'],
      },
    ],
  },
];

export const TYPE_DESCRIPTIONS: Record<string, string> = {
  // Числовые типы
  TINYINT:
    'Целое число очень малого размера (1 байт). Диапазон: -128 до 127 или 0 до 255 (UNSIGNED).',
  SMALLINT:
    'Целое число малого размера (2 байта). Диапазон: -32,768 до 32,767 или 0 до 65,535 (UNSIGNED).',
  INT: 'Целое число стандартного размера (4 байта). Диапазон: -2,147,483,648 до 2,147,483,647 или 0 до 4,294,967,295 (UNSIGNED).',
  INTEGER: 'Синоним для INT. Целое число стандартного размера (4 байта).',
  BIGINT:
    'Целое число большого размера (8 байт). Диапазон: -9,223,372,036,854,775,808 до 9,223,372,036,854,775,807 или 0 до 18,446,744,073,709,551,615 (UNSIGNED).',
  FLOAT32: 'Число с плавающей запятой одинарной точности (4 байта).',
  FLOAT: 'Число с плавающей запятой одинарной точности (4 байта).',
  FLOAT64: 'Число с плавающей запятой двойной точности (8 байт).',
  DOUBLE: 'Число с плавающей запятой двойной точности (8 байт).',
  DECIMAL:
    'Число с фиксированной точностью и масштабом. Пример: DECIMAL(5,2) для чисел типа 123.45, -99.99',
  NUMERIC: 'Синоним DECIMAL. Число с фиксированной точностью.',
  NUMBER:
    'Универсальный числовой тип в Oracle (может быть целым или с плавающей запятой).',
  BINARY_FLOAT: '32-битное число с плавающей запятой в Oracle.',
  BINARY_DOUBLE: '64-битное число с плавающей запятой в Oracle.',

  // Строковые типы
  FIXEDSTRING: 'Строка фиксированной длины в ClickHouse.',
  CHAR: 'Строка фиксированной длины (до 255 символов). Заполняется пробелами.',
  STRING: 'Строка переменной длины (в ClickHouse, MongoDB, Elasticsearch).',
  VARCHAR:
    'Строка переменной длины (до 65,535 символов в зависимости от СУБД).',
  TEXT: 'Длинная текстовая строка (обычно до 65,535 символов).',
  NCHAR: 'Строка фиксированной длины в Unicode.',
  NVARCHAR: 'Строка переменной длины в Unicode.',
  CLOB: 'Символьный большой объект для хранения больших текстов.',
  LONGTEXT: 'Очень длинный текст (до 4 ГБ в MySQL/MariaDB).',

  // Бинарные типы
  BINARY: 'Бинарные данные фиксированной длины.',
  VARBINARY: 'Бинарные данные переменной длины.',
  BLOB: 'Бинарные данные большого объема (до 65,535 байт).',
  BYTEA: 'Бинарные данные в PostgreSQL.',
  RAW: 'Бинарные данные переменной длины в Oracle.',
  BINARY_JSON: 'Бинарное представление JSON в MongoDB.',

  // Дата и время
  DATE: 'Дата в формате ГГГГ-ММ-ДД.',
  TIME: 'Время в формате ЧЧ:ММ:СС.',
  DATETIME: 'Дата и время в формате ГГГГ-ММ-ДД ЧЧ:ММ:СС.',
  TIMESTAMP: 'Метка времени (обычно с 1970 года).',
  DATETIME64: 'Дата и время с повышенной точностью в ClickHouse.',
  TIMESTAMPTZ:
    'Метка времени с часовым поясом. Пример: "2025-05-23 14:30:00+03:00"',
  INTERVAL: 'Интервал времени (используется для хранения периодов).',

  // Логические типы
  UINT8:
    'Беззнаковое 8-битное целое число (0-255) в ClickHouse, часто используется как булев тип.',
  BOOLEAN: 'Логический тип (TRUE/FALSE).',
  BIT: 'Битовое значение (0 или 1).',
  BOOL: 'Синоним BOOLEAN в SQLite.',

  // JSON и специализированные
  JSON: 'Данные в формате JSON.',
  JSONB: 'Двоичное представление JSON (в PostgreSQL).',
  UUID: 'Уникальный идентификатор (16 байт). Пример: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"',
  XML: 'Данные в формате XML.',
  BSON: 'Бинарный JSON в MongoDB.',

  // Геометрические типы
  GEOMETRY: 'Геометрический тип данных (точки, линии и т.д.).',
  POINT: 'Точка в геометрических координатах.',
  LINESTRING: 'Линия из нескольких точек.',
  POLYGON: 'Замкнутая геометрическая фигура.',
  GEOJSON: 'Географические данные в формате GeoJSON.',

  // Массивы и составные
  ARRAY: 'Массив значений.',
  ENUM: "Перечисление (фиксированный набор значений). Пример: ENUM('red', 'green', 'blue')",
  SET: "Набор значений из определенного списка. Пример: SET('a', 'b', 'c')",
  NESTED: 'Вложенные структуры в Elasticsearch.',

  // ClickHouse-специфичные
  'LowCardinality(String)':
    'Оптимизированное хранение строк с низкой кардинальностью в ClickHouse.',
  'Nullable(T)': 'Тип, который может содержать NULL в ClickHouse.',
  IPv4: 'Тип для хранения IPv4 адресов в ClickHouse.',
  IPv6: 'Тип для хранения IPv6 адресов в ClickHouse.',
  AggregateFunction: 'Тип для агрегатных функций в ClickHouse.',
};

export const SIZE_DEPENDENT_TYPES = [
  'CHAR',
  'VARCHAR',
  'NCHAR',
  'NVARCHAR',
  'BINARY',
  'VARBINARY',
  'BIT',
  'FIXEDSTRING',
  'STRING',
];

export const PRECISION_SCALE_DEPENDENT_TYPES = [
  'DECIMAL',
  'NUMERIC',
  'NUMBER',
  'DATETIME64',
];

export const FORM_INPUTS_SHADOW_COLOR = 'rgba(32,167,201,0.1)';
