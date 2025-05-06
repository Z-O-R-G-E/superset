import {
  createContext,
  useContext,
  useMemo,
  FC,
  PropsWithChildren,
} from 'react';
import { FieldsUploaderFormProps } from '../../types';

const ComponentStateContext = createContext<
  FieldsUploaderFormProps | undefined
>(undefined);
ComponentStateContext.displayName = 'ComponentStateContext';

export const ComponentStateProvider: FC<
  PropsWithChildren<FieldsUploaderFormProps>
> = ({ children, component, updateComponents, editMode }) => {
  // Создаем объект, соответствующий ожидаемому типу контекста
  const contextValue = useMemo<FieldsUploaderFormProps>(
    () => ({ component, updateComponents, editMode }),
    [component, updateComponents, editMode],
  );

  return (
    <ComponentStateContext.Provider value={contextValue}>
      {children}
    </ComponentStateContext.Provider>
  );
};

export const useComponentState = (): FieldsUploaderFormProps => {
  const context = useContext(ComponentStateContext);
  if (!context) {
    throw new Error(
      'useComponentState должен использоваться внутри ComponentStateProvider',
    );
  }
  return context;
};
