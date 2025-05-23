type ValidatorType =
  | 'TINYINT' // 1 байт (-128..127)
  | 'SMALLINT' // 2 байта (-32,768..32,767)
  | 'INT' // 4 байта (-2,147,483,648..2,147,483,647)
  | 'INTEGER' // Синоним INT
  | 'BIGINT' // 8 байт (-9,223,372,036,854,775,808..9,223,372,036,854,775,807)
  | 'FLOAT' // 4 байта (~7 знаков)
  | 'DOUBLE' // 8 байт (~15 знаков)
  | 'REAL' // Синоним FLOAT (в некоторых СУБД — DOUBLE)
  | 'DECIMAL' // Точное число (p, s)
  | 'NUMERIC' // Синоним DECIMAL
  | 'CHAR' // Фиксированная строка (n)
  | 'VARCHAR' // Строка переменной длины (n)
  | 'TEXT' // Длинный текст
  | 'NCHAR' // Unicode CHAR (n)
  | 'NVARCHAR' // Unicode VARCHAR (n)
  | 'NTEXT' // Unicode TEXT
  | 'BINARY' // Бинарные данные фиксированной длины (n)
  | 'VARBINARY' // Бинарные данные переменной длины (n)
  | 'DATE' // Дата (YYYY-MM-DD)
  | 'TIME' // Время (HH:MM:SS)
  | 'DATETIME' // Дата + время
  | 'TIMESTAMP' // UNIX-время
  | 'TIMESTAMPTZ' // TIMESTAMP WITH TIME ZONE
  | 'BOOLEAN' // Логический тип (true/false)
  | 'BIT' // Битовое поле (n)
  | 'ENUM' // Перечисление (val1, val2, ...)
  | 'SET' // Множество значений
  | 'JSON' // JSON-строка
  | 'JSONB' // Бинарный JSON (PostgreSQL)
  | 'UUID' // Уникальный идентификатор
  | 'ARRAY' // Массив (в PostgreSQL {1,2,3})
  | 'GEOMETRY' // Геометрические данные (WKT)
  | 'POINT' // Точка (x y)
  | 'LINESTRING' // Линия
  | 'POLYGON' // Полигон
  | 'BLOB' // Бинарные данные
  | 'LONGBLOB' // Большие бинарные данные
  | 'MEDIUMBLOB' // Средние бинарные данные
  | 'TINYBLOB' // Маленькие бинарные данные
  | string; // Кастомные типы

interface ValidationOptions {
  size?: number; // Для CHAR, VARCHAR, BINARY и др.
  precision?: number; // Для DECIMAL (общее число цифр)
  scale?: number; // Для DECIMAL (цифры после точки)
  setEnum?: string[]; // Для ENUM и SET (допустимые значения)
}

export const validateType =
  (type: ValidatorType, options?: ValidationOptions) =>
  (_: any, value: any): Promise<void> => {
    if (!value && value !== 0 && value !== false) {
      return Promise.resolve();
    }

    const error = (msg: string) => Promise.reject(new Error(msg));

    switch (type.toUpperCase()) {
      // === Числовые типы ===
      case 'TINYINT': {
        if (!/^-?\d+$/.test(value)) return error('Должно быть целым числом');
        const num = parseInt(value, 10);
        if (num < -128 || num > 127) {
          return error('Диапазон TINYINT: от -128 до 127');
        }
        return Promise.resolve();
      }

      case 'SMALLINT': {
        if (!/^-?\d+$/.test(value)) return error('Должно быть целым числом');
        const num = parseInt(value, 10);
        if (num < -32768 || num > 32767) {
          return error('Диапазон SMALLINT: от -32,768 до 32,767');
        }
        return Promise.resolve();
      }

      case 'INT':
      case 'INTEGER': {
        if (!/^-?\d+$/.test(value)) return error('Должно быть целым числом');
        const num = parseInt(value, 10);
        if (num < -2147483648 || num > 2147483647) {
          return error('Диапазон INT: от -2,147,483,648 до 2,147,483,647');
        }
        return Promise.resolve();
      }

      case 'BIGINT': {
        if (!/^-?\d+$/.test(value)) return error('Должно быть целым числом');
        const max = BigInt('9223372036854775807');
        const min = BigInt('-9223372036854775808');
        try {
          const bigIntValue = BigInt(value);
          if (bigIntValue < min || bigIntValue > max) {
            return error('Диапазон BIGINT: ±9,223,372,036,854,775,808');
          }
        } catch (e) {
          return error('Недопустимое значение для BIGINT');
        }
        return Promise.resolve();
      }

      case 'FLOAT':
      case 'REAL': {
        if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(value)) {
          return error('Должно быть числом с плавающей точкой');
        }
        const num = parseFloat(value);
        if (num < -3.4e38 || num > 3.4e38) {
          return error('Диапазон FLOAT: ±3.4e38');
        }
        return Promise.resolve();
      }

      case 'DOUBLE': {
        if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(value)) {
          return error('Должно быть числом с плавающей точкой');
        }
        const num = parseFloat(value);
        if (num < -1.7e308 || num > 1.7e308) {
          return error('Диапазон DOUBLE: ±1.7e308');
        }
        return Promise.resolve();
      }

      case 'DECIMAL':
      case 'NUMERIC': {
        if (!/^-?\d*\.?\d+$/.test(value)) {
          return error('Должно быть десятичным числом');
        }
        const [intPart = '', decPart = ''] = value.split('.');

        if (options?.precision !== undefined && options?.scale !== undefined) {
          const maxIntDigits = options.precision - options.scale;
          if (intPart.replace('-', '').length > maxIntDigits) {
            return error(`Максимум ${maxIntDigits} цифр до точки`);
          }
          if (decPart.length > options.scale) {
            return error(`Максимум ${options.scale} знаков после точки`);
          }
        }
        return Promise.resolve();
      }

      // === Строковые типы ===
      case 'CHAR': {
        const expectedLength = options?.size ?? 1;
        if (value.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} символов`);
        }
        return Promise.resolve();
      }

      case 'VARCHAR': {
        const maxLength = options?.size ?? 255;
        if (value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} символов`);
        }
        return Promise.resolve();
      }

      case 'NCHAR': {
        const expectedLength = options?.size ?? 1;
        if (value.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} Unicode-символов`);
        }
        return Promise.resolve();
      }

      case 'NVARCHAR': {
        const maxLength = options?.size ?? 255;
        if (value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} Unicode-символов`);
        }
        return Promise.resolve();
      }

      case 'TEXT':
      case 'NTEXT': {
        const maxLength = options?.size ?? 65535;
        if (value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} символов`);
        }
        return Promise.resolve();
      }

      // === Бинарные типы ===
      case 'BINARY': {
        const expectedLength = options?.size ?? 1;
        if (value.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} байт`);
        }
        return Promise.resolve();
      }

      case 'VARBINARY': {
        const maxLength = options?.size ?? 255;
        if (value.length > maxLength) {
          return error(`Максимальная длина ${maxLength} байт`);
        }
        return Promise.resolve();
      }

      case 'BLOB':
      case 'LONGBLOB':
      case 'MEDIUMBLOB':
      case 'TINYBLOB':
      case 'BYTEA': {
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(value);
        const isHex = /^[0-9A-Fa-f]+$/.test(value);
        if (!isBase64 && !isHex) {
          return error('Должно быть в формате base64 или hex');
        }
        if (options?.size && value.length > options.size * 2) {
          return error(`Максимальный размер ${options.size} байт`);
        }
        return Promise.resolve();
      }

      // === Дата и время ===
      case 'DATE': {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return error('Формат даты: YYYY-MM-DD');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return error('Некорректная дата');
        return Promise.resolve();
      }

      case 'TIME': {
        if (!/^\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(value)) {
          return error('Формат времени: HH:MM[:SS[.миллисекунды]]');
        }
        return Promise.resolve();
      }

      case 'DATETIME': {
        if (
          !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i.test(value)
        ) {
          return error('Формат: YYYY-MM-DD HH:MM:SS[.миллисекунды]');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
          return error('Некорректная дата/время');
        return Promise.resolve();
      }

      case 'TIMESTAMP':
      case 'TIMESTAMPTZ': {
        if (
          !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/i.test(
            value,
          )
        ) {
          return error('Формат: YYYY-MM-DD HH:MM:SS[.миллисекунды][±HH:MM]');
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
          return error('Некорректная дата/время');
        return Promise.resolve();
      }

      // === Логические и битовые типы ===
      case 'BOOLEAN': {
        const valid = ['true', 'false', '1', '0', 'yes', 'no'].includes(
          String(value).toLowerCase(),
        );
        if (!valid)
          return error('Допустимые значения: true/false, 1/0, yes/no');
        return Promise.resolve();
      }

      case 'BIT': {
        const expectedLength = options?.size ?? 1;
        if (!/^[01]+$/.test(value)) return error('Должно состоять из 0 и 1');
        if (value.length !== expectedLength) {
          return error(`Должно быть ровно ${expectedLength} бит`);
        }
        return Promise.resolve();
      }

      // === ENUM и SET ===
      case 'ENUM': {
        if (!options?.setEnum?.includes(value)) {
          return error(`Допустимые значения: ${options?.setEnum?.join(', ')}`);
        }
        return Promise.resolve();
      }

      case 'SET': {
        const values = value.split(',');
        const invalidValues = values.filter(
          (v: string) => !options?.setEnum?.includes(v),
        );
        if (invalidValues.length > 0) {
          return error(`Недопустимые значения: ${invalidValues.join(', ')}`);
        }
        return Promise.resolve();
      }

      // === JSON ===
      case 'JSON':
      case 'JSONB': {
        try {
          JSON.parse(value);
          return Promise.resolve();
        } catch (e) {
          return error(`Невалидный JSON: ${(e as Error).message}`);
        }
      }

      // === UUID ===
      case 'UUID': {
        const regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!regex.test(value))
          return error('Неверный формат UUID (версии 1-5)');
        return Promise.resolve();
      }

      // === Массивы ===
      case 'ARRAY': {
        if (!/^\{.*\}$/.test(value)) {
          return error('Формат массива: {элемент1,элемент2}');
        }
        return Promise.resolve();
      }

      // === Геометрические типы ===
      case 'GEOMETRY':
      case 'POINT':
      case 'LINESTRING':
      case 'POLYGON': {
        // Простейшая проверка WKT (Well-Known Text)
        if (!/^[A-Z]+\s*\(.*\)$/.test(value)) {
          return error('Формат: WKT (например, POINT(10 20))');
        }
        return Promise.resolve();
      }

      default:
        return Promise.resolve();
    }
  };
