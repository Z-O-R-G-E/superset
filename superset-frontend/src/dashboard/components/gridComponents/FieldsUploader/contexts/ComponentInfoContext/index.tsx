import {
  createContext,
  Dispatch,
  FC,
  memo,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useMemo,
} from 'react';

type ComponentInfoContextType = {
  editMode: boolean;
  setDisableDragDrop: Dispatch<SetStateAction<boolean>>;
  columnWidth: number;
  widthMultiple: number;
};

const ComponentInfoContext = createContext<ComponentInfoContextType | null>(
  null,
);

export const ComponentInfoProvider: FC<
  PropsWithChildren<{ componentInfo: ComponentInfoContextType }>
> = memo(({ componentInfo, children }) => {
  const value = useMemo(() => componentInfo, [componentInfo]);

  return (
    <ComponentInfoContext.Provider value={value}>
      {children}
    </ComponentInfoContext.Provider>
  );
});

export const useComponentInfo = (): ComponentInfoContextType => {
  const context = useContext(ComponentInfoContext);
  if (!context) {
    throw new Error(
      'useComponentInfo must be used within ComponentInfoProvider',
    );
  }
  return context;
};
