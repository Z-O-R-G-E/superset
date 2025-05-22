type ValidatorType =
  | 'INT'
  | 'INTEGER'
  | 'BIGINT'
  | 'FLOAT'
  | 'DOUBLE'
  | 'REAL'
  | 'DECIMAL'
  | 'VARCHAR'
  | 'CHAR'
  | 'TEXT'
  | 'DATE'
  | 'TIME'
  | 'TIMESTAMP'
  | 'TIMESTAMP WITH TIME ZONE'
  | 'BOOLEAN'
  | 'BYTEA'
  | 'BLOB'
  | 'JSON'
  | 'JSONB'
  | 'UUID'
  | 'ARRAY'
  | string;

export const validateType =
  (type: ValidatorType) =>
  (_: any, value: any): Promise<void> => {
    if (!value && value !== 0 && value !== false) {
      return Promise.resolve();
    }

    const error = (msg: string) => Promise.reject(new Error(msg));

    switch (type) {
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
        if (value.length > 19) return error('Слишком большое число для BIGINT');
        return Promise.resolve();
      }

      case 'FLOAT':
      case 'DOUBLE':
      case 'REAL': {
        if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(value)) {
          return error('Должно быть числом с плавающей точкой');
        }
        const num = parseFloat(value);
        if (type === 'FLOAT' && (num < -3.4e38 || num > 3.4e38)) {
          return error('Диапазон FLOAT: ±3.4e38');
        }
        return Promise.resolve();
      }

      case 'DECIMAL': {
        if (!/^-?\d*\.?\d+$/.test(value)) {
          return error('Должно быть десятичным числом');
        }
        const parts = value.split('.');
        if (parts[0].length > 10) return error('Максимум 10 цифр до точки');
        if (parts[1]?.length > 4) return error('Максимум 4 знака после точки');
        return Promise.resolve();
      }

      case 'VARCHAR': {
        if (value.length > 255) return error('Максимальная длина 255 символов');
        return Promise.resolve();
      }

      case 'CHAR': {
        if (value.length !== 1) return error('Должен быть ровно 1 символ');
        return Promise.resolve();
      }

      case 'TEXT': {
        if (value.length > 65535) return error('Слишком длинный текст');
        return Promise.resolve();
      }

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

      case 'TIMESTAMP':
      case 'TIMESTAMP WITH TIME ZONE': {
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

      case 'BOOLEAN': {
        const valid = ['true', 'false', '1', '0', 'yes', 'no'].includes(
          String(value).toLowerCase(),
        );
        if (!valid)
          return error('Допустимые значения: true/false, 1/0, yes/no');
        return Promise.resolve();
      }

      case 'BYTEA':
      case 'BLOB': {
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(value);
        const isHex = /^[0-9A-Fa-f]+$/.test(value);
        if (!isBase64 && !isHex) {
          return error('Должно быть в формате base64 или hex');
        }
        return Promise.resolve();
      }

      case 'JSON':
      case 'JSONB': {
        try {
          JSON.parse(value);
          return Promise.resolve();
        } catch (e) {
          return error(`Невалидный JSON: ${(e as Error).message}`);
        }
      }

      case 'UUID': {
        const regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!regex.test(value))
          return error('Неверный формат UUID (версии 1-5)');
        return Promise.resolve();
      }

      case 'ARRAY': {
        if (!/^\{.*\}$/.test(value)) {
          return error('Формат массива: {элемент1,элемент2}');
        }
        return Promise.resolve();
      }

      default:
        return Promise.resolve();
    }
  };
