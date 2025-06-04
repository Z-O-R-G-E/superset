import { SpecificUploadFieldType, ValidatorType } from '../../types';

const REGEX = {
  INTEGER: /^-?\d+$/,
  FLOAT: /^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/,
  DECIMAL: /^-?\d*\.?\d+$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}(:\d{2})?(\.\d+)?$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  DATETIME64: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  TIMESTAMP:
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i,
  BIT: /^[01]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ARRAY: /^\{.*\}$/,
  GEOMETRY: /^[A-Z]+\s*\(.*\)$/,
  BASE64: /^[A-Za-z0-9+/=]+$/,
  HEX: /^[0-9A-Fa-f]+$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^((([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,7}:)|(([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2})|(([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3})|(([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4})|(([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5})|([0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6}))|(:((:[0-9a-fA-F]{1,4}){1,7}|:))|(fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,})|(::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))|(([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])))$/,
  INTERVAL: /^(\d+ )?\d{2}:\d{2}:\d{2}(\.\d+)?$/,
  GEOJSON: /^{"type":"[A-Za-z]+","coordinates":/,
};

const NUMERIC_LIMITS = {
  TINYINT: { min: -128, max: 127 },
  SMALLINT: { min: -32768, max: 32767 },
  INT: { min: -2147483648, max: 2147483647 },
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
};

const BOOLEAN_VALUES = new Set(['true', 'false', '1', '0', 'yes', 'no']);

export const validateType =
  (type: ValidatorType, options?: SpecificUploadFieldType) =>
  (_: any, value: any): Promise<void> => {
    if (value === null || value === undefined || value === '') {
      return Promise.resolve();
    }

    const error = (msg: string) => Promise.reject(new Error(msg));
    const typeUpper = type.toUpperCase();

    switch (typeUpper) {
      case 'TINYINT':
      case 'SMALLINT':
      case 'INT':
      case 'INTEGER':
      case 'UINT8': {
        if (!REGEX.INTEGER.test(value))
          return error('Должно быть целым числом');
        const num = parseInt(value, 10);
        const limits = NUMERIC_LIMITS[typeUpper as keyof typeof NUMERIC_LIMITS];
        if (num < limits.min || num > limits.max) {
          return error(
            `Диапазон ${typeUpper}: от ${limits.min} до ${limits.max}`,
          );
        }
        break;
      }

      case 'BIGINT': {
        if (!REGEX.INTEGER.test(value))
          return error('Должно быть целым числом');
        try {
          const bigIntValue = BigInt(value);
          if (
            bigIntValue < NUMERIC_LIMITS.BIGINT.min ||
            bigIntValue > NUMERIC_LIMITS.BIGINT.max
          ) {
            return error('Диапазон BIGINT: ±9,223,372,036,854,775,808');
          }
        } catch {
          return error('Недопустимое значение для BIGINT');
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
        if (!REGEX.FLOAT.test(value) || Number.isNaN(Number(value))) {
          return error('Должно быть числом с плавающей точкой');
        }
        const num = parseFloat(value);
        const limitsKey =
          typeUpper === 'FLOAT64' ||
          typeUpper === 'DOUBLE' ||
          typeUpper === 'BINARY_DOUBLE'
            ? 'DOUBLE'
            : 'FLOAT';
        const limits = NUMERIC_LIMITS[limitsKey];
        if (num < limits.min || num > limits.max) {
          return error(`Диапазон ${typeUpper}: ±${limits.max.toExponential()}`);
        }
        break;
      }

      case 'DECIMAL':
      case 'NUMERIC':
      case 'NUMBER': {
        if (!REGEX.DECIMAL.test(value)) {
          return error('Должно быть десятичным числом');
        }
        if (options?.precision !== undefined && options?.scale !== undefined) {
          const [intPart = '', decPart = ''] = value.split('.');
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

      case 'CHAR':
      case 'NCHAR':
      case 'BINARY':
      case 'FIXEDSTRING': {
        const maxLength = options?.size ?? (typeUpper === 'BINARY' ? 1 : 1);
        if (typeof value !== 'string' || value.length > maxLength) {
          const typeName = typeUpper === 'BINARY' ? 'байт' : 'символов';
          return error(`Максимальная длина ${maxLength} ${typeName}`);
        }
        break;
      }

      case 'VARCHAR':
      case 'NVARCHAR':
      case 'VARBINARY':
      case 'STRING': {
        const maxLength =
          options?.size ?? (typeUpper === 'VARBINARY' ? 255 : 255);
        if (typeof value !== 'string' || value.length > maxLength) {
          const typeName = typeUpper === 'VARBINARY' ? 'байт' : 'символов';
          return error(`Максимальная длина ${maxLength} ${typeName}`);
        }
        break;
      }

      case 'TEXT':
      case 'LONGTEXT':
      case 'CLOB': {
        const maxLength = options?.size ?? 65535;
        if (typeof value !== 'string' || value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} символов`);
        }
        break;
      }

      case 'BLOB':
      case 'BYTEA':
      case 'RAW':
      case 'BINARY_JSON': {
        const maxSize = options?.size ?? 65535;
        if (!REGEX.BASE64.test(value) && !REGEX.HEX.test(value)) {
          return error('Должно быть в формате base64 или hex');
        }
        if (value.length > maxSize * 1.33) {
          return error(`Максимальный размер ${maxSize} байт`);
        }
        break;
      }

      case 'DATE': {
        if (!REGEX.DATE.test(value)) {
          return error('Формат даты: YYYY-MM-DD');
        }
        const [year, month, day] = value.split('-').map(Number);
        if (month < 1 || month > 12) return error('Некорректный месяц');
        const date = new Date(year, month - 1, day);
        if (
          date.getFullYear() !== year ||
          date.getMonth() + 1 !== month ||
          date.getDate() !== day
        ) {
          return error('Некорректная дата');
        }
        break;
      }

      case 'TIME': {
        if (!REGEX.TIME.test(value)) {
          return error('Формат времени: HH:MM[:SS[.миллисекунды]]');
        }
        const dummyDate = new Date(`1970-01-01T${value}`);
        if (Number.isNaN(dummyDate.getTime())) {
          return error('Некорректное время (например, 25:61:61)');
        }
        break;
      }

      case 'DATETIME':
      case 'DATETIME64': {
        if (!REGEX.DATETIME.test(value)) {
          return error('Формат: YYYY-MM-DD HH:MM:SS[.миллисекунды]');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
          return error('Некорректная дата/время');
        break;
      }

      case 'TIMESTAMP':
      case 'TIMESTAMPTZ': {
        if (!REGEX.TIMESTAMP.test(value)) {
          return error('Формат: YYYY-MM-DD HH:MM:SS[.миллисекунды][±HH:MM]');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
          return error('Некорректная дата/время');
        break;
      }

      case 'INTERVAL': {
        if (!REGEX.INTERVAL.test(value)) {
          return error('Формат интервала: [DD ]HH:MM:SS[.миллисекунды]');
        }
        break;
      }

      case 'BOOLEAN':
      case 'BOOL': {
        if (!BOOLEAN_VALUES.has(String(value).toLowerCase())) {
          return error('Допустимые значения: true/false, 1/0, yes/no');
        }
        break;
      }

      case 'BIT': {
        const expectedLength = options?.size ?? 1;
        if (!REGEX.BIT.test(value)) return error('Должно состоять из 0 и 1');
        if (value.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} бит`);
        }
        break;
      }

      case 'JSON':
      case 'JSONB':
      case 'BSON': {
        try {
          JSON.parse(value);
        } catch (e) {
          return error(`Невалидный JSON: ${(e as Error).message}`);
        }
        break;
      }

      case 'UUID': {
        if (!REGEX.UUID.test(value)) {
          return error('Неверный формат UUID (версии 1-5)');
        }
        break;
      }

      case 'XML': {
        if (!value.startsWith('<') || !value.endsWith('>')) {
          return error('Неверный формат XML');
        }
        break;
      }

      case 'GEOMETRY':
      case 'POINT':
      case 'LINESTRING':
      case 'POLYGON': {
        if (!REGEX.GEOMETRY.test(value)) {
          return error('Формат: WKT (например, POINT(10 20))');
        }
        break;
      }

      case 'GEOJSON': {
        if (!REGEX.GEOJSON.test(value)) {
          return error('Неверный формат GeoJSON');
        }
        try {
          JSON.parse(value);
        } catch (e) {
          return error(`Невалидный GeoJSON: ${(e as Error).message}`);
        }
        break;
      }

      case 'ARRAY': {
        if (!REGEX.ARRAY.test(value)) {
          return error('Формат массива: {элемент1,элемент2}');
        }
        break;
      }

      case 'ENUM': {
        if (!options?.setEnum) {
          return error('Не заданы допустимые значения ENUM');
        }
        if (!options.setEnum.includes(value)) {
          return error(`Допустимые значения: ${options.setEnum.join(', ')}`);
        }
        break;
      }

      case 'SET': {
        if (!options?.setEnum) {
          return error('Не заданы допустимые значения SET');
        }
        const values = String(value).split(',');
        const invalidValues = values.filter(v => !options.setEnum?.includes(v));
        if (invalidValues.length > 0) {
          return error(`Недопустимые значения: ${invalidValues.join(', ')}`);
        }
        break;
      }

      case 'NESTED': {
        try {
          JSON.parse(value);
        } catch (e) {
          return error(
            `Невалидная вложенная структура: ${(e as Error).message}`,
          );
        }
        break;
      }

      case 'LOWCARDINALITY(STRING)': {
        if (typeof value !== 'string') {
          return error('Должно быть строкой');
        }
        break;
      }

      case 'NULLABLE(T)': {
        if (value === null) return Promise.resolve();
        // Здесь можно добавить валидацию для конкретного типа T
        break;
      }

      case 'IPV4': {
        if (!REGEX.IPV4.test(value)) {
          return error('Неверный формат IPv4 адреса');
        }
        break;
      }

      case 'IPV6': {
        if (!REGEX.IPV6.test(value)) {
          return error('Неверный формат IPv6 адреса');
        }
        break;
      }

      case 'AGGREGATEFUNCTION': {
        if (
          typeof value !== 'string' ||
          !value.includes('(') ||
          !value.includes(')')
        ) {
          return error('Неверный формат агрегатной функции');
        }
        break;
      }

      default:
        return error(`Неизвестный тип данных: ${type}`);
    }

    return Promise.resolve();
  };
