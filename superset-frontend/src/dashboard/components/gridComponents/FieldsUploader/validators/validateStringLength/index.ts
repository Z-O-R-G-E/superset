export const validateStringLength =
  (length: number) =>
  (_: any, value: any): Promise<void> => {
    if (value.length > length) {
      return Promise.reject(
        new Error(`Максимальная длина символов - ${length}.`),
      );
    }
    return Promise.resolve();
  };
