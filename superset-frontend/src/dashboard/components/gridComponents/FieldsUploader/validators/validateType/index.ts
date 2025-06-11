import { SpecificUploadFieldType, SubdType, ValidatorType } from '../../types';

type NumericLimits = Omit<SpecificUploadFieldType, 'size' | 'enumValues'> & {
  min: number | bigint;
  max: number | bigint;
};

const NUMERIC_LIMITS: Record<string, NumericLimits> = {
  TINYINT: { min: -128, max: 127 },
  SMALLINT: { min: -32768, max: 32767 },
  INT: { min: -2147483648, max: 2147483647 },
  INTEGER: { min: -2147483648, max: 2147483647 },
  BIGINT: {
    min: BigInt('-9223372036854775808'),
    max: BigInt('9223372036854775807'),
  },
  FLOAT: { min: -3.4e38, max: 3.4e38 },
  FLOAT32: { min: -3.4e38, max: 3.4e38 },
  FLOAT64: { min: -1.7e308, max: 1.7e308 },
  DOUBLE: { min: -1.7e308, max: 1.7e308 },
  BINARY_FLOAT: { min: -3.4e38, max: 3.4e38 },
  BINARY_DOUBLE: { min: -1.7e308, max: 1.7e308 },
  UINT8: { min: 0, max: 255 },
  ORACLE_NUMBER: { min: -1e125, max: 1e125, precision: 38, scale: 127 }, // Добавлены min/max
};

const STRING_LIMITS: Record<SubdType, Record<string, number>> = {
  postgresql: { CHAR: 255, VARCHAR: 10485760, TEXT: Infinity },
  mysql: { CHAR: 255, VARCHAR: 65535, TEXT: 65535, LONGTEXT: 4294967295 },
  mariadb: { CHAR: 255, VARCHAR: 65535, TEXT: 65535, LONGTEXT: 4294967295 },
  oracle: { CHAR: 2000, VARCHAR2: 4000, CLOB: 128 * 1024 * 1024 },
  sqlite: { CHAR: 255, VARCHAR: 255, TEXT: Infinity },
  mssql: { CHAR: 8000, VARCHAR: 8000, TEXT: 2147483647 },
  clickhouse: { STRING: Infinity, FIXEDSTRING: 255 },
  mongodb: { STRING: Infinity },
  elasticsearch: { STRING: Infinity },
};

const BINARY_LIMITS: Record<SubdType, Record<string, number>> = {
  postgresql: { BYTEA: Infinity },
  mysql: { BINARY: 255, VARBINARY: 65535, BLOB: 65535, LONGBLOB: 4294967295 },
  mariadb: { BINARY: 255, VARBINARY: 65535, BLOB: 65535, LONGBLOB: 4294967295 },
  oracle: { RAW: 2000, BLOB: 128 * 1024 * 1024 },
  sqlite: { BLOB: Infinity },
  mssql: { BINARY: 8000, VARBINARY: 8000, IMAGE: 2147483647 },
  clickhouse: { BINARY: Infinity },
  mongodb: { BINARY: Infinity },
  elasticsearch: { BINARY: Infinity },
};

const REGEX = {
  INTEGER: /^-?\d+$/,
  FLOAT: /^-?\d+(\.\d+)?(?:[eE][-+]?\d+)?$/,
  DECIMAL: /^-?\d+(\.\d+)?$/,
  DATE: {
    DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}$/,
    YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/,
    ORACLE: /^\d{2}-\w{3}-\d{4}$/i,
  },
  TIME: /^\d{2}:\d{2}(:\d{2})?(\.\d+)?$/,
  DATETIME: {
    DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
    YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
    ORACLE: /^\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2}$/i,
  },
  TIMESTAMP: {
    DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/i,
    YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/i,
    ORACLE: /^\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2}\.\d+$/i,
  },
  TIMESTAMPTZ: {
    DD_MM_YYYY:
      /^\d{2}-\d{2}-\d{4}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(?:Z|[+-]\d{2}:\d{2})$/i,
    YYYY_MM_DD:
      /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(?:Z|[+-]\d{2}:\d{2})$/i,
    ORACLE: /^\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2}\.\d+ [A-Z]+\/[A-Z]+$/i,
  },
  BIT: /^[01]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  BASE64: /^[A-Za-z0-9+/=]+$/,
  HEX: /^[0-9A-Fa-f]+$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^((([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,7}:)|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:))|(fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,})|(::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))|(([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])))$/,
  INTERVAL: /^(\d+ )?\d{2}:\d{2}:\d{2}(\.\d+)?$/,
  GEOJSON: /^{"type":"[A-Za-z]+","coordinates":/,
  GEOMETRY: /^[A-Z]+\s*\(.*\)$/,
  ORACLE_NUMBER: /^-?\d+(\.\d+)?$/,
  MONGODB_OBJECTID: /^[0-9a-fA-F]{24}$/,
  ARRAY: {
    POSTGRES: /^\{.*\}$/,
    DEFAULT: /^\[.*\]$/,
  },
};

const BOOLEAN_VALUES = new Set([
  'true',
  'false',
  '1',
  '0',
  'yes',
  'no',
  'y',
  'n',
]);

const getStringLimit = (
  type: string,
  subdType: SubdType,
  size?: number,
): number => {
  if (size !== undefined) return size;

  const typeUpper = type.toUpperCase();
  const limits = STRING_LIMITS[subdType] || STRING_LIMITS.postgresql;

  return (
    limits[typeUpper] ||
    limits[typeUpper.replace(/^NVARCHAR$/, 'VARCHAR')] ||
    limits[typeUpper.replace(/^NCHAR$/, 'CHAR')] ||
    255
  );
};

const getBinaryLimit = (
  type: string,
  subdType: SubdType,
  size?: number,
): number => {
  if (size !== undefined) return size;

  const typeUpper = type.toUpperCase();
  const limits = BINARY_LIMITS[subdType] || BINARY_LIMITS.postgresql;

  return (
    limits[typeUpper] ||
    limits[typeUpper.replace(/^VARBINARY$/, 'BINARY')] ||
    limits[typeUpper.replace(/^BLOB$/, 'BYTEA')] ||
    65535
  );
};

const validateOracleDate = (value: string): string | null => {
  if (!REGEX.DATE.ORACLE.test(value)) {
    return 'Неверный формат даты Oracle. Ожидается: DD-MON-YYYY';
  }

  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const parts = value.split('-');
  const day = parseInt(parts[0], 10);
  const month = parts[1].toUpperCase();
  const year = parseInt(parts[2], 10);

  if (!months.includes(month)) {
    return `Неверное название месяца. Допустимые значения: ${months.join(
      ', ',
    )}`;
  }

  const monthIdx = months.indexOf(month);
  const maxDays = new Date(year, monthIdx + 1, 0).getDate();

  if (day < 1 || day > maxDays) {
    return `День должен быть от 1 до ${maxDays} для месяца ${month}`;
  }

  return null;
};

const validateDate = (value: string, dayFirst: boolean): string | null => {
  const regex = dayFirst ? REGEX.DATE.DD_MM_YYYY : REGEX.DATE.YYYY_MM_DD;
  const format = dayFirst ? 'DD-MM-YYYY' : 'YYYY-MM-DD';

  if (!regex.test(value)) {
    return `Неверный формат даты. Ожидается: ${format}`;
  }

  const parts = value.split('-');
  const year = dayFirst ? parseInt(parts[2], 10) : parseInt(parts[0], 10);
  const month = dayFirst ? parseInt(parts[1], 10) : parseInt(parts[1], 10);
  const day = dayFirst ? parseInt(parts[0], 10) : parseInt(parts[2], 10);

  if (month < 1 || month > 12) {
    return 'Месяц должен быть от 1 до 12';
  }

  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) {
    return `День должен быть от 1 до ${maxDays} для ${month}-го месяца ${year} года`;
  }

  return null;
};

const validateTime = (value: string): string | null => {
  if (!REGEX.TIME.test(value)) {
    return 'Неверный формат времени. Ожидается: HH:MM[:SS[.миллисекунды]]';
  }

  const parts = value.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts[2] ? parseFloat(parts[2]) : 0;

  if (hours < 0 || hours > 23) return 'Часы должны быть от 0 до 23';
  if (minutes < 0 || minutes > 59) return 'Минуты должны быть от 0 до 59';
  if (seconds < 0 || seconds >= 60)
    return 'Секунды должны быть от 0 до 59.999...';

  return null;
};

const validateDateTime = (value: string, dayFirst: boolean): string | null => {
  const separator = value.includes('T') ? 'T' : ' ';
  const [datePart, timePart] = value.split(separator);

  if (!datePart || !timePart) {
    const format = dayFirst ? 'DD-MM-YYYY HH:MM:SS' : 'YYYY-MM-DD HH:MM:SS';
    return `Неверный формат даты и времени. Ожидается: ${format}`;
  }

  const dateError = validateDate(datePart, dayFirst);
  if (dateError) return dateError;

  return validateTime(timePart);
};

const validateTimestamp = (
  value: string,
  dayFirst: boolean,
  isTz: boolean,
): string | null => {
  const regex = isTz
    ? dayFirst
      ? REGEX.TIMESTAMPTZ.DD_MM_YYYY
      : REGEX.TIMESTAMPTZ.YYYY_MM_DD
    : dayFirst
      ? REGEX.TIMESTAMP.DD_MM_YYYY
      : REGEX.TIMESTAMP.YYYY_MM_DD;

  if (!regex.test(value)) {
    const expectedFormat = dayFirst
      ? 'DD-MM-YYYY HH:MM:SS'
      : 'YYYY-MM-DD HH:MM:SS';
    return `Неверный формат ${
      isTz ? 'timestamptz' : 'timestamp'
    }. Ожидается: ${expectedFormat}${
      isTz ? ' с временной зоной (Z или ±HH:MM)' : ''
    }`;
  }

  if (isTz && !/[+-]\d{2}:\d{2}|Z/i.test(value)) {
    return 'Для типа timestamptz обязательна временная зона (Z или ±HH:MM)';
  }

  return null;
};

const validateMongoDBValue = (type: string, value: string): string | null => {
  if (type === 'BSON') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return 'BSON должен быть объектом в формате JSON ({"key":"value"})';
      }
    } catch (e) {
      return `Невалидный BSON: ${
        (e as Error).message
      }. Ожидается валидный JSON объект`;
    }
  }

  if (type === 'OBJECTID' && !REGEX.MONGODB_OBJECTID.test(value)) {
    return 'Неверный формат ObjectId. Ожидается 24 hex символа (например, 507f1f77bcf86cd799439011)';
  }

  return null;
};

const validateArray = (value: string, subdType: SubdType): string | null => {
  const isPostgres = subdType === 'postgresql' || subdType === 'oracle';
  const regex = isPostgres ? REGEX.ARRAY.POSTGRES : REGEX.ARRAY.DEFAULT;

  if (!regex.test(value)) {
    return (
      `Неверный формат массива для ${subdType}. ` +
      `Ожидается: ${isPostgres ? '{элемент1,элемент2}' : '[элемент1,элемент2]'}`
    );
  }

  return null;
};

// Основная функция валидации
export const validateType =
  (
    type: ValidatorType,
    subdType: SubdType,
    dayFirst: boolean,
    options?: SpecificUploadFieldType,
  ) =>
  (_: any, value: any): Promise<void> => {
    if (value === null || value === undefined || value === '') {
      return Promise.resolve();
    }

    const error = (msg: string) => Promise.reject(new Error(msg));
    const typeUpper = type.toUpperCase();
    const stringValue = String(value);

    // Специфичные проверки для MongoDB
    if (subdType === 'mongodb') {
      const mongoError = validateMongoDBValue(typeUpper, stringValue);
      if (mongoError) return error(mongoError);
    }

    // Специфичные проверки для Oracle
    if (
      subdType === 'oracle' &&
      (typeUpper === 'DATE' || typeUpper === 'TIMESTAMP')
    ) {
      const oracleError = validateOracleDate(stringValue);
      if (oracleError) return error(oracleError);
    }

    switch (typeUpper) {
      // Числовые типы
      case 'TINYINT':
      case 'SMALLINT':
      case 'INT':
      case 'INTEGER':
      case 'UINT8': {
        if (!REGEX.INTEGER.test(stringValue)) {
          return error('Должно быть целым числом');
        }

        const limits = NUMERIC_LIMITS[typeUpper];
        const num = parseInt(stringValue, 10);

        if (typeof limits.min === 'number' && num < limits.min) {
          return error(`Значение не может быть меньше ${limits.min}`);
        }
        if (typeof limits.max === 'number' && num > limits.max) {
          return error(`Значение не может быть больше ${limits.max}`);
        }
        break;
      }

      case 'BIGINT': {
        if (!REGEX.INTEGER.test(stringValue)) {
          return error('Должно быть целым числом');
        }

        try {
          const bigIntValue = BigInt(stringValue);
          const limits = NUMERIC_LIMITS.BIGINT;

          if (bigIntValue < limits.min) {
            return error(`Значение не может быть меньше ${limits.min}`);
          }
          if (bigIntValue > limits.max) {
            return error(`Значение не может быть больше ${limits.max}`);
          }
        } catch {
          return error(
            'Недопустимое значение для BIGINT. Ожидается большое целое число',
          );
        }
        break;
      }

      case 'FLOAT':
      case 'FLOAT32':
      case 'FLOAT64':
      case 'DOUBLE':
      case 'REAL':
      case 'BINARY_FLOAT':
      case 'BINARY_DOUBLE': {
        if (
          !REGEX.FLOAT.test(stringValue) ||
          Number.isNaN(Number(stringValue))
        ) {
          return error('Должно быть числом с плавающей точкой');
        }

        const num = parseFloat(stringValue);
        const limits =
          NUMERIC_LIMITS[
            typeUpper === 'FLOAT64' ||
            typeUpper === 'DOUBLE' ||
            typeUpper === 'BINARY_DOUBLE'
              ? 'DOUBLE'
              : 'FLOAT'
          ];

        if (num < limits.min) {
          return error(`Значение не может быть меньше ${limits.min}`);
        }
        if (num > limits.max) {
          return error(`Значение не может быть больше ${limits.max}`);
        }
        break;
      }

      case 'DECIMAL':
      case 'NUMERIC':
      case 'NUMBER': {
        const regex =
          subdType === 'oracle' ? REGEX.ORACLE_NUMBER : REGEX.DECIMAL;
        if (!regex.test(stringValue)) {
          return error('Должно быть десятичным числом');
        }

        const num = parseFloat(stringValue);
        const limits =
          NUMERIC_LIMITS[typeUpper] || NUMERIC_LIMITS.ORACLE_NUMBER;

        // Проверка диапазона
        if (num < limits.min) {
          return error(`Значение не может быть меньше ${limits.min}`);
        }
        if (num > limits.max) {
          return error(`Значение не может быть больше ${limits.max}`);
        }

        // Проверка precision/scale если указаны
        if (options?.precision !== undefined && options?.scale !== undefined) {
          const [intPart = '', decPart = ''] = stringValue.split('.');
          const maxIntDigits = options.precision - options.scale;

          if (intPart.replace('-', '').length > maxIntDigits) {
            return error(`Максимум ${maxIntDigits} цифр до точки`);
          }
          if (decPart.length > options.scale) {
            return error(`Максимум ${options.scale} знаков после точки`);
          }
        }
        break;
      }

      // Строковые типы
      case 'CHAR':
      case 'NCHAR':
      case 'VARCHAR':
      case 'NVARCHAR':
      case 'STRING':
      case 'TEXT':
      case 'LONGTEXT':
      case 'CLOB':
      case 'FIXEDSTRING': {
        const maxLength = getStringLimit(type, subdType, options?.size);

        if (typeof value !== 'string') {
          return error('Должно быть строкой');
        }
        if (value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} символов`);
        }
        break;
      }

      // Бинарные типы
      case 'BINARY':
      case 'VARBINARY':
      case 'BLOB':
      case 'BYTEA':
      case 'RAW': {
        const maxSize = getBinaryLimit(type, subdType, options?.size);

        if (!REGEX.BASE64.test(stringValue) && !REGEX.HEX.test(stringValue)) {
          return error(
            'Должно быть в формате base64 (например, "SGVsbG8=") или hex (например, "48656C6C6F")',
          );
        }

        const byteLength = REGEX.BASE64.test(stringValue)
          ? Math.ceil((stringValue.length * 3) / 4) -
            (stringValue.endsWith('==') ? 2 : stringValue.endsWith('=') ? 1 : 0)
          : Math.ceil(stringValue.length / 2);

        if (byteLength > maxSize) {
          return error(`Максимальный размер ${maxSize} байт`);
        }
        break;
      }

      // Дата и время
      case 'DATE': {
        const dateError =
          subdType === 'oracle'
            ? validateOracleDate(stringValue)
            : validateDate(stringValue, dayFirst);

        if (dateError) return error(dateError);
        break;
      }

      case 'TIME': {
        const timeError = validateTime(stringValue);
        if (timeError) return error(timeError);
        break;
      }

      case 'DATETIME':
      case 'DATETIME64': {
        const dateTimeError =
          subdType === 'oracle'
            ? REGEX.DATETIME.ORACLE.test(stringValue)
              ? null
              : 'Формат даты-времени Oracle: DD-MON-YYYY HH24:MI:SS'
            : validateDateTime(stringValue, dayFirst);

        if (dateTimeError) return error(dateTimeError);
        break;
      }

      case 'TIMESTAMP': {
        const timestampError =
          subdType === 'oracle'
            ? REGEX.TIMESTAMP.ORACLE.test(stringValue)
              ? null
              : 'Формат Oracle TIMESTAMP: DD-MON-YYYY HH24:MI:SS.FF'
            : validateTimestamp(stringValue, dayFirst, false);

        if (timestampError) return error(timestampError);
        break;
      }

      case 'TIMESTAMPTZ': {
        const timestampError =
          subdType === 'oracle'
            ? REGEX.TIMESTAMPTZ.ORACLE.test(stringValue)
              ? null
              : 'Формат Oracle TIMESTAMPTZ: DD-MON-YYYY HH24:MI:SS.FF TZR'
            : validateTimestamp(stringValue, dayFirst, true);

        if (timestampError) return error(timestampError);
        break;
      }

      case 'INTERVAL': {
        if (!REGEX.INTERVAL.test(stringValue)) {
          return error('Формат интервала: [DD ]HH:MM:SS[.миллисекунды]');
        }
        break;
      }

      // Логические типы
      case 'BOOLEAN':
      case 'BOOL': {
        if (!BOOLEAN_VALUES.has(stringValue.toLowerCase())) {
          return error('Допустимые значения: true/false, 1/0, yes/no, y/n');
        }
        break;
      }

      case 'BIT': {
        const expectedLength = options?.size ?? 1;
        if (!REGEX.BIT.test(stringValue)) {
          return error('Должно состоять из 0 и 1');
        }
        if (expectedLength > 0 && stringValue.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} бит`);
        }
        break;
      }

      // JSON и подобные
      case 'JSON':
      case 'JSONB':
      case 'BSON': {
        try {
          JSON.parse(stringValue);
        } catch (e) {
          return error(
            `Невалидный ${typeUpper}: ${
              (e as Error).message
            }. Ожидается валидный JSON (например, {"key":"value"})`,
          );
        }
        break;
      }

      // Специальные типы
      case 'UUID': {
        if (!REGEX.UUID.test(stringValue)) {
          return error(
            'Неверный формат UUID (версии 1-5). Ожидается формат: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx',
          );
        }
        break;
      }

      case 'XML': {
        if (!stringValue.startsWith('<') || !stringValue.endsWith('>')) {
          return error(
            'Неверный формат XML. Ожидается валидный XML документ (например, <tag>value</tag>)',
          );
        }
        break;
      }

      case 'GEOMETRY':
      case 'POINT':
      case 'LINESTRING':
      case 'POLYGON': {
        if (!/^(POINT|LINESTRING|POLYGON)\s*\(.*\)$/i.test(stringValue)) {
          return error(
            'Формат: WKT (например, POINT(10 20), LINESTRING(0 0, 1 1))',
          );
        }
        break;
      }

      case 'GEOJSON': {
        if (!REGEX.GEOJSON.test(stringValue)) {
          return error(
            'Неверный формат GeoJSON. Ожидается объект GeoJSON (например, {"type":"Point","coordinates":[0,0]})',
          );
        }
        try {
          JSON.parse(stringValue);
        } catch (e) {
          return error(
            `Невалидный GeoJSON: ${
              (e as Error).message
            }. Ожидается валидный GeoJSON объект`,
          );
        }
        break;
      }

      case 'ARRAY': {
        const arrayError = validateArray(stringValue, subdType);
        if (arrayError) return error(arrayError);
        break;
      }

      case 'ENUM': {
        if (!options?.enumValues) {
          return error(
            'Не заданы допустимые значения ENUM. Укажите возможные значения в настройках поля',
          );
        }
        if (!options.enumValues.includes(value)) {
          return error(`Допустимые значения: ${options.enumValues.join(', ')}`);
        }
        break;
      }

      case 'SET': {
        if (!options?.enumValues) {
          return error(
            'Не заданы допустимые значения SET. Укажите возможные значения в настройках поля',
          );
        }
        const values = stringValue.split(',');
        const invalidValues = values.filter(
          v => !options.enumValues?.includes(v),
        );
        if (invalidValues.length > 0) {
          return error(
            `Недопустимые значения: ${invalidValues.join(
              ', ',
            )}. Допустимые значения: ${options.enumValues.join(', ')}`,
          );
        }
        break;
      }

      case 'IPV4': {
        if (!REGEX.IPV4.test(stringValue)) {
          return error(
            'Неверный формат IPv4 адреса. Ожидается формат: xxx.xxx.xxx.xxx',
          );
        }
        break;
      }

      case 'IPV6': {
        if (!REGEX.IPV6.test(stringValue)) {
          return error(
            'Неверный формат IPv6 адреса. Ожидается формат: xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx',
          );
        }
        break;
      }

      case 'OBJECTID': {
        if (!REGEX.MONGODB_OBJECTID.test(stringValue)) {
          return error(
            'Неверный формат ObjectId. Ожидается 24 hex символа (например, 507f1f77bcf86cd799439011)',
          );
        }
        break;
      }

      default:
        return error(
          `Неизвестный тип данных: ${type}. Проверьте правильность указания типа`,
        );
    }

    return Promise.resolve();
  };
