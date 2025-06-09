import { SpecificUploadFieldType, ValidatorType } from '../../types';

const REGEX = {
  INTEGER: /^-?\d+$/,
  FLOAT: /^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/,
  DECIMAL: /^-?\d*\.?\d+$/,
  DATE_DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}$/,
  DATE_YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}(:\d{2})?(\.\d+)?$/,
  DATETIME_DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  DATETIME_YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  DATETIME64_DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  DATETIME64_YYYY_MM_DD: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i,
  TIMESTAMP_DD_MM_YYYY:
    /^\d{2}-\d{2}-\d{4}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/i,
  TIMESTAMP_YYYY_MM_DD:
    /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?$/i,
  TIMESTAMPTZ_DD_MM_YYYY:
    /^\d{2}-\d{2}-\d{4}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(?:Z|[+-]\d{2}:\d{2})$/i,
  TIMESTAMPTZ_YYYY_MM_DD:
    /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(?:Z|[+-]\d{2}:\d{2})$/i,
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
};

const BOOLEAN_VALUES = new Set(['true', 'false', '1', '0', 'yes', 'no']);

const parseDateParts = (value: string, dayFirst: boolean) => {
  const parts = value.split('-');
  if (parts.length !== 3) {
    throw new Error('Неверный формат даты');
  }
  return dayFirst
    ? { day: Number(parts[0]), month: Number(parts[1]), year: Number(parts[2]) }
    : {
        year: Number(parts[0]),
        month: Number(parts[1]),
        day: Number(parts[2]),
      };
};

const validateDate = (value: string, dayFirst: boolean) => {
  const dateRegex = dayFirst ? REGEX.DATE_DD_MM_YYYY : REGEX.DATE_YYYY_MM_DD;
  const expectedFormat = dayFirst ? 'DD-MM-YYYY' : 'YYYY-MM-DD';

  if (!dateRegex.test(value)) {
    return `Неверный формат даты. Ожидается: ${expectedFormat}`;
  }

  try {
    const { year, month, day } = parseDateParts(value, dayFirst);

    if (month < 1 || month > 12) {
      return 'Месяц должен быть от 1 до 12';
    }

    const maxDays = new Date(year, month, 0).getDate();
    if (day < 1 || day > maxDays) {
      return `День должен быть от 1 до ${maxDays} для указанного месяца и года`;
    }

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    ) {
      return 'Некорректная дата';
    }
  } catch (e) {
    return 'Неверный формат даты';
  }

  return null;
};

const validateTime = (timePart: string) => {
  if (!REGEX.TIME.test(timePart)) {
    return 'Неверный формат времени. Ожидается: HH:MM[:SS[.миллисекунды]]';
  }

  const timeParts = timePart.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  const seconds = timeParts[2] ? parseFloat(timeParts[2]) : 0;

  if (hours < 0 || hours > 23) return 'Часы должны быть от 0 до 23';
  if (minutes < 0 || minutes > 59) return 'Минуты должны быть от 0 до 59';
  if (seconds < 0 || seconds >= 60)
    return 'Секунды должны быть от 0 до 59.999...';

  return null;
};

const validateDateTime = (value: string, dayFirst: boolean) => {
  const separator = value.includes('T') ? 'T' : ' ';
  const [datePart, timePart] = value.split(separator);

  if (!datePart || !timePart) {
    return 'Неверный формат даты и времени. Ожидается: YYYY-MM-DD HH:MM:SS';
  }

  const dateError = validateDate(datePart, dayFirst);
  if (dateError) return dateError;

  return validateTime(timePart);
};

const validateTimestamp = (value: string, dayFirst: boolean, isTz = false) => {
  const expectedFormat = dayFirst
    ? isTz
      ? 'DD-MM-YYYY HH:MM:SS±HH:MM или Z'
      : 'DD-MM-YYYY[ HH:MM:SS]'
    : isTz
      ? 'YYYY-MM-DD HH:MM:SS±HH:MM или Z'
      : 'YYYY-MM-DD[ HH:MM:SS]';

  const timestampRegex = isTz
    ? dayFirst
      ? REGEX.TIMESTAMPTZ_DD_MM_YYYY
      : REGEX.TIMESTAMPTZ_YYYY_MM_DD
    : dayFirst
      ? REGEX.TIMESTAMP_DD_MM_YYYY
      : REGEX.TIMESTAMP_YYYY_MM_DD;

  if (!timestampRegex.test(value)) {
    return `Неверный формат ${
      isTz ? 'timestamptz' : 'timestamp'
    }. Ожидается: ${expectedFormat}`;
  }

  if (isTz && !/[+-]\d{2}:\d{2}|Z/i.test(value)) {
    return 'Для типа timestamptz обязательна временная зона (Z или ±HH:MM)';
  }

  const timeZoneSplit = value.split(/([+-]\d{2}:\d{2}|Z)/);
  const dateTimePart = timeZoneSplit[0];
  const tzPart = timeZoneSplit[1] || '';
  const hasTime = /[ T]\d{2}:\d{2}/.test(dateTimePart);
  const separator = dateTimePart.includes('T') ? 'T' : ' ';
  const datePart = hasTime ? dateTimePart.split(separator)[0] : dateTimePart;

  const dateError = validateDate(datePart, dayFirst);
  if (dateError) return dateError;

  if (hasTime) {
    const timePart = dateTimePart.split(separator)[1];
    const timeError = validateTime(timePart);
    if (timeError) return timeError;
  }

  if (tzPart) {
    if (tzPart === 'Z') return null;
    if (!/^[+-]\d{2}:\d{2}$/.test(tzPart)) {
      return 'Неверный формат временной зоны. Ожидается: Z или ±HH:MM';
    }
    const [tzHours, tzMinutes] = tzPart.substring(1).split(':').map(Number);
    if (tzHours > 14 || tzMinutes > 59) {
      return 'Неверное смещение временной зоны (максимум ±14:59)';
    }
  }

  return null;
};

export const validateType =
  (type: ValidatorType, dayFirst: boolean, options?: SpecificUploadFieldType) =>
  (_: any, value: any): Promise<void> => {
    if (value === null || value === undefined || value === '') {
      return Promise.resolve();
    }

    const error = (msg: string) => Promise.reject(new Error(msg));
    const typeUpper = type.toUpperCase();
    const stringValue = String(value);

    switch (typeUpper) {
      case 'TINYINT':
      case 'SMALLINT':
      case 'INT':
      case 'INTEGER':
      case 'UINT8': {
        if (!REGEX.INTEGER.test(stringValue))
          return error('Должно быть целым числом');
        const num = parseInt(stringValue, 10);
        const limits =
          NUMERIC_LIMITS[typeUpper as keyof typeof NUMERIC_LIMITS] ||
          NUMERIC_LIMITS.INT;
        if (num < limits.min || num > limits.max) {
          return error(
            `Диапазон ${typeUpper}: от ${limits.min} до ${limits.max}`,
          );
        }
        break;
      }

      case 'BIGINT': {
        if (!REGEX.INTEGER.test(stringValue))
          return error('Должно быть целым числом');
        try {
          const bigIntValue = BigInt(stringValue);
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
        if (
          !REGEX.FLOAT.test(stringValue) ||
          Number.isNaN(Number(stringValue))
        ) {
          return error('Должно быть числом с плавающей точкой');
        }
        const num = parseFloat(stringValue);
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
        if (!REGEX.DECIMAL.test(stringValue)) {
          return error('Должно быть десятичным числом');
        }
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
        if (!REGEX.BASE64.test(stringValue) && !REGEX.HEX.test(stringValue)) {
          return error('Должно быть в формате base64 или hex');
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

      case 'DATE': {
        const dateError = validateDate(stringValue, dayFirst);
        if (dateError) return error(dateError);
        break;
      }

      case 'TIME': {
        if (!REGEX.TIME.test(stringValue)) {
          return error('Формат времени: HH:MM[:SS[.миллисекунды]]');
        }
        const dummyDate = new Date(`1970-01-01T${stringValue}`);
        if (Number.isNaN(dummyDate.getTime())) {
          return error('Некорректное время (например, 25:61:61)');
        }
        break;
      }

      case 'DATETIME':
      case 'DATETIME64': {
        const dateTimeError = validateDateTime(stringValue, dayFirst);
        if (dateTimeError) return error(dateTimeError);
        break;
      }

      case 'TIMESTAMP': {
        const timestampError = validateTimestamp(stringValue, dayFirst, false);
        if (timestampError) return error(timestampError);
        break;
      }

      case 'TIMESTAMPTZ': {
        const timestampError = validateTimestamp(stringValue, dayFirst, true);
        if (timestampError) return error(timestampError);
        break;
      }

      case 'INTERVAL': {
        if (!REGEX.INTERVAL.test(stringValue)) {
          return error('Формат интервала: [DD ]HH:MM:SS[.миллисекунды]');
        }
        break;
      }

      case 'BOOLEAN':
      case 'BOOL': {
        if (!BOOLEAN_VALUES.has(stringValue.toLowerCase())) {
          return error('Допустимые значения: true/false, 1/0, yes/no');
        }
        break;
      }

      case 'BIT': {
        const expectedLength = options?.size ?? 1;
        if (!REGEX.BIT.test(stringValue))
          return error('Должно состоять из 0 и 1');
        if (expectedLength > 0 && stringValue.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} бит`);
        }
        break;
      }

      case 'JSON':
      case 'JSONB':
      case 'BSON': {
        try {
          JSON.parse(stringValue);
        } catch (e) {
          return error(`Невалидный JSON: ${(e as Error).message}`);
        }
        break;
      }

      case 'UUID': {
        if (!REGEX.UUID.test(stringValue)) {
          return error('Неверный формат UUID (версии 1-5)');
        }
        break;
      }

      case 'XML': {
        if (!stringValue.startsWith('<') || !stringValue.endsWith('>')) {
          return error('Неверный формат XML');
        }
        break;
      }

      case 'GEOMETRY':
      case 'POINT':
      case 'LINESTRING':
      case 'POLYGON': {
        if (!REGEX.GEOMETRY.test(stringValue)) {
          return error('Формат: WKT (например, POINT(10 20))');
        }
        break;
      }

      case 'GEOJSON': {
        if (!REGEX.GEOJSON.test(stringValue)) {
          return error('Неверный формат GeoJSON');
        }
        try {
          JSON.parse(stringValue);
        } catch (e) {
          return error(`Невалидный GeoJSON: ${(e as Error).message}`);
        }
        break;
      }

      case 'ARRAY': {
        if (!REGEX.ARRAY.test(stringValue)) {
          return error('Формат массива: {элемент1,элемент2}');
        }
        break;
      }

      case 'ENUM': {
        if (!options?.enumValues) {
          return error('Не заданы допустимые значения ENUM');
        }
        if (!options.enumValues.includes(value)) {
          return error(`Допустимые значения: ${options.enumValues.join(', ')}`);
        }
        break;
      }

      case 'SET': {
        if (!options?.enumValues) {
          return error('Не заданы допустимые значения SET');
        }
        const values = stringValue.split(',');
        const invalidValues = values.filter(
          v => !options.enumValues?.includes(v),
        );
        if (invalidValues.length > 0) {
          return error(`Недопустимые значения: ${invalidValues.join(', ')}`);
        }
        break;
      }

      case 'NESTED': {
        try {
          JSON.parse(stringValue);
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
        break;
      }

      case 'IPV4': {
        if (!REGEX.IPV4.test(stringValue)) {
          return error('Неверный формат IPv4 адреса');
        }
        break;
      }

      case 'IPV6': {
        if (!REGEX.IPV6.test(stringValue)) {
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
