import {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { ComponentType, ComponentFunc, UploadInfoType } from '../../types';
import { shallowEqual } from '../../utils';

type UpdateUploadInfoFn = <K extends keyof UploadInfoType>(
  key: K,
  value: UploadInfoType[K],
) => void;

export const initialUploadInfo: UploadInfoType = {
  database: undefined,
  schema: undefined,
  table: '',
  fields: [],
};

const UploadInfoContext = createContext<UploadInfoType | null>(null);
const UpdateUploadInfoContext = createContext<UpdateUploadInfoFn | null>(null);

export const useOptimizedUpdateUploadInfo = (
  component: ComponentType,
  updateComponents: ComponentFunc,
) =>
  useCallback<UpdateUploadInfoFn>(
    (key, value) => {
      const prevUploadInfo = component.meta.uploadInfo ?? initialUploadInfo;
      if (prevUploadInfo[key] === value) return;

      const shouldUpdate =
        typeof value === 'object'
          ? !shallowEqual({ [key]: prevUploadInfo[key] }, { [key]: value })
          : true;

      if (shouldUpdate) {
        const updatedUploadInfo = { ...prevUploadInfo, [key]: value };
        if (key === 'database') {
          updatedUploadInfo.schema = undefined;
        }

        updateComponents({
          [component.id]: {
            ...component,
            meta: { ...component.meta, uploadInfo: updatedUploadInfo },
          },
        });
      }
    },
    [component, updateComponents],
  );

export const UploadInfoProvider: FC<
  PropsWithChildren<{
    uploadInfo: UploadInfoType;
    updateUploadInfo: UpdateUploadInfoFn;
  }>
> = memo(({ uploadInfo, updateUploadInfo, children }) => {
  const infoValue = useMemo(() => uploadInfo, [uploadInfo]);
  const updateValue = useMemo(() => updateUploadInfo, [updateUploadInfo]);

  return (
    <UploadInfoContext.Provider value={infoValue}>
      <UpdateUploadInfoContext.Provider value={updateValue}>
        {children}
      </UpdateUploadInfoContext.Provider>
    </UploadInfoContext.Provider>
  );
});

export const useUploadInfo = () => {
  const context = useContext(UploadInfoContext);
  if (!context) throw new Error('useUploadInfo requires UploadInfoProvider');
  return context;
};

export const useUpdateUploadInfo = () => {
  const context = useContext(UpdateUploadInfoContext);
  if (!context)
    throw new Error('useUpdateUploadInfo requires UploadInfoProvider');
  return context;
};
