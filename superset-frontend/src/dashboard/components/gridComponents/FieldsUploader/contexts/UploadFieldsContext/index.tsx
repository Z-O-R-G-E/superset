import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';
import { UploadFieldType, ComponentType, ComponentFunc } from '../../types';
import { shallowEqual } from '../../utils';

type UpdateUploadFieldsFn = (fields: UploadFieldType[]) => void;

const UploadFieldsContext = createContext<UploadFieldType[] | null>(null);
const UpdateUploadFieldsContext = createContext<UpdateUploadFieldsFn | null>(
  null,
);

export const useOptimizedUpdateUploadFields = (
  component: ComponentType,
  updateComponents: ComponentFunc,
): UpdateUploadFieldsFn =>
  useCallback(
    fields => {
      const prev = component.meta.uploadFields ?? [];
      if (shallowEqual(prev, fields)) return;

      updateComponents({
        [component.id]: {
          ...component,
          meta: { ...component.meta, uploadFields: fields },
        },
      });
    },
    [component, updateComponents],
  );

export const UploadFieldsProvider: FC<
  PropsWithChildren<{
    uploadFields: UploadFieldType[];
    updateUploadFields: UpdateUploadFieldsFn;
  }>
> = memo(({ uploadFields, updateUploadFields, children }) => (
  <UploadFieldsContext.Provider value={uploadFields}>
    <UpdateUploadFieldsContext.Provider value={updateUploadFields}>
      {children}
    </UpdateUploadFieldsContext.Provider>
  </UploadFieldsContext.Provider>
));

export const useUploadFields = () => {
  const ctx = useContext(UploadFieldsContext);
  if (!ctx)
    throw new Error('useUploadFields must be used within UploadFieldsProvider');
  return ctx;
};

export const useUpdateUploadFields = () => {
  const ctx = useContext(UpdateUploadFieldsContext);
  if (!ctx)
    throw new Error(
      'useUpdateUploadFields must be used within UploadFieldsProvider',
    );
  return ctx;
};
