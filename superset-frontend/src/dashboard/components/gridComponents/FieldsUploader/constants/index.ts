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
    'Целое число очень малого размера (1 байт).\nДиапазон: -128 до 127 (SIGNED) или 0 до 255 (UNSIGNED).',
  SMALLINT:
    'Целое число малого размера (2 байта).\nДиапазон: -32,768 до 32,767 (SIGNED) или 0 до 65,535 (UNSIGNED).',
  INT: 'Целое число стандартного размера (4 байта).\nДиапазон: -2,147,483,648 до 2,147,483,647 (SIGNED) или 0 до 4,294,967,295 (UNSIGNED).',
  INTEGER:
    'Целое число стандартного размера (4 байта).\nДиапазон: -2,147,483,648 до 2,147,483,647 (SIGNED) или 0 до 4,294,967,295 (UNSIGNED).',
  BIGINT:
    'Целое число большого размера (8 байт).\nДиапазон: -9,223,372,036,854,775,808 до 9,223,372,036,854,775,807 (SIGNED) или 0 до 18,446,744,073,709,551,615 (UNSIGNED).',
  FLOAT32:
    'Число с плавающей запятой одинарной точности (4 байта).\nПриблизительный диапазон: ±1.18×10⁻³⁸ до ±3.4×10³⁸.',
  FLOAT:
    'Число с плавающей запятой одинарной точности (4 байта).\nПриблизительный диапазон: ±1.18×10⁻³⁸ до ±3.4×10³⁸.',
  FLOAT64:
    'Число с плавающей запятой двойной точности (8 байт).\nПриблизительный диапазон: ±2.23×10⁻³⁰⁸ до ±1.80×10³⁰⁸.',
  DOUBLE:
    'Число с плавающей запятой двойной точности (8 байт).\nПриблизительный диапазон: ±2.23×10⁻³⁰⁸ до ±1.80×10³⁰⁸.',
  DECIMAL:
    'Число с фиксированной точностью и масштабом. Точное хранение.\nПример: DECIMAL(5,2) хранит числа от -999.99 до 999.99.',
  NUMERIC:
    'Число с фиксированной точностью и масштабом. Точное хранение.\nПример: DECIMAL(5,2) хранит числа от -999.99 до 999.99.',
  NUMBER:
    'Может хранить целые числа, числа с плавающей запятой и с фиксированной точкой.',
  BINARY_FLOAT:
    'Число с плавающей запятой одинарной точности (4 байта).\nПриблизительный диапазон: ±1.18×10⁻³⁸ до ±3.4×10³⁸.',
  BINARY_DOUBLE:
    'Число с плавающей запятой двойной точности (8 байт).\nПриблизительный диапазон: ±2.23×10⁻³⁰⁸ до ±1.80×10³⁰⁸.',

  // Строковые типы
  FIXEDSTRING: 'Строка фиксированной длины.\nЗанимает ровно N байт.',
  CHAR: 'Строка фиксированной длины (до 255 символов).\nЗаполняется пробелами до указанной длины.',
  STRING: 'Строка переменной длины без ограничений.',
  VARCHAR:
    'Строка переменной длины с ограничением (обычно до 65,535 символов).\nРеальное ограничение зависит от СУБД и кодировки.',
  TEXT: 'Длинная текстовая строка.\nВ MySQL/MariaDB до 65,535 символов.\nВ PostgreSQL без ограничений.',
  NCHAR:
    'Строка фиксированной длины (до 255 символов) в Unicode.\nЗаполняется пробелами до указанной длины.',
  NVARCHAR:
    'Строка переменной длины с ограничением (обычно до 65,535 символов) в Unicode.\nРеальное ограничение зависит от СУБД и кодировки.',
  CLOB: 'Символьный большой объект для хранения текстов размером до 4 ГБ и более.',
  LONGTEXT: 'Очень длинный текст.\n(4,294,967,295 символов).',

  // Бинарные типы
  BINARY:
    'Бинарные данные фиксированной длины\n(аналог CHAR для бинарных данных).',
  VARBINARY:
    'Бинарные данные переменной длины\n(аналог VARCHAR для бинарных данных).',
  BLOB: 'Бинарный большой объект.\nВ MySQL до 65,535 байт (BLOB),\nдо 4 ГБ (LONGBLOB).',
  BYTEA: 'Бинарные данные переменной длины.',
  RAW: 'Бинарные данные переменной длины.',
  BINARY_JSON: 'Бинарное представление JSON.',

  // Дата и время
  DATE: 'Дата в формате ГГГГ-ММ-ДД.\nДиапазон обычно от 1000-01-01 до 9999-12-31.',
  TIME: 'Время в формате ЧЧ:ММ:СС.\nМожет включать дробные секунды.',
  DATETIME:
    'Дата и время в формате ГГГГ-ММ-ДД ЧЧ:ММ:СС.\nДиапазон зависит от СУБД.',
  TIMESTAMP:
    'Метка времени (обычно Unix-время с 1970-01-01).\nЗависит от часового пояса в некоторых СУБД.',
  DATETIME64: 'Дата и время с повышенной точностью (до наносекунд).',
  TIMESTAMPTZ:
    'Метка времени с часовым поясом.\nПример: "2025-05-23 14:30:00+03:00".\nХранится в UTC.',
  INTERVAL:
    'Интервал времени (используется для хранения периодов).\nМожет быть год/месяц или день/время.',

  // Логические типы
  UINT8: 'Беззнаковое 8-битное целое число (0-255).',
  BOOLEAN: 'Логический тип (TRUE/FALSE).\nВ некоторых СУБД хранится как 1/0.',
  BIT: 'Битовое значение (0 или 1).\nВ SQL Server может быть битовой строкой (BIT(3)).',
  BOOL: 'Логический тип (TRUE/FALSE).\nВ некоторых СУБД хранится как 1/0.',

  // JSON и специализированные
  JSON: 'Данные в формате JSON с проверкой валидности.\nПоддержка зависит от СУБД.',
  JSONB: 'Двоичное представление JSON\n(оптимизировано для запросов).',
  UUID: 'Уникальный идентификатор (16 байт).\nПример: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11".',
  XML: 'Данные в формате XML с проверкой валидности.\nПоддержка зависит от СУБД.',
  BSON: 'Бинарный JSON.\nОптимизирован для хранения и запросов.',

  // Геометрические типы
  GEOMETRY:
    'Базовый тип для геометрических объектов\n(точки, линии, полигоны и т.д.).',
  POINT: 'Точка в двумерном или трехмерном пространстве\n(координаты X,Y[,Z]).',
  LINESTRING: 'Последовательность точек, образующих линию.',
  POLYGON: 'Замкнутая геометрическая фигура, состоящая из точек.',
  GEOJSON: 'Географические данные в формате GeoJSON.',

  // Массивы и составные
  ARRAY: 'Массив значений одного типа.\nПоддержка зависит от СУБД.',
  ENUM: "Перечисление (фиксированный набор строковых значений).\nПример: ENUM('red', 'green', 'blue').",
  SET: "Набор значений из определенного списка (может содержать несколько значений).\nПример: SET('a', 'b', 'c').",
  NESTED: 'Вложенные структуры в Elasticsearch\n(аналог массивов объектов).',

  // ClickHouse-специфичные
  'LowCardinality(String)':
    'Оптимизированное хранение строк с малым количеством уникальных значений.',
  IPv4: 'Тип для хранения IPv4 адресов.\nОптимизирован для сетевых операций.',
  IPv6: 'Тип для хранения IPv6 адресов.\nОптимизирован для сетевых операций.',
  AggregateFunction:
    'Специальный тип для промежуточных состояний агрегатных функций.',
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

export const MULTIPLE_STRING_DEPENDENT_TYPES = [
  'TEXT',
  'VARCHAR',
  'CHAR',
  'NCHAR',
  'NVARCHAR',
  'CLOB',
  'LONGTEXT',
  'STRING',
  'JSON',
  'JSONB',
  'XML',
  'BSON',
  'GEOJSON',
];

export const PRECISION_SCALE_DEPENDENT_TYPES = [
  'DECIMAL',
  'NUMERIC',
  'NUMBER',
  'DATETIME64',
];

export const FORM_INPUTS_SHADOW_COLOR = 'rgba(70, 190, 214, 0.25)';
export const COLOR_PRIMARY_HOVER = 'rgb(70, 190, 214)';
export const MODAL_MARK_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.45)';
export const MODAL_MARK_BACKDROP_FILLER = 'blur(7px)';
