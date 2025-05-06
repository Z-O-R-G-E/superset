import {
  createContext,
  useContext,
  useState,
  useMemo,
  Dispatch,
  SetStateAction,
  FC,
  ReactNode,
} from 'react';
import { UploadInfoType } from '../../types';

interface UploadInfoContextType {
  uploadInfo: UploadInfoType | null;
  setUploadInfo: Dispatch<SetStateAction<UploadInfoType | null>>;
}

const UploadInfoContext = createContext<UploadInfoContextType | undefined>(
  undefined,
);

UploadInfoContext.displayName = 'UploadInfoContext';

export const UploadInfoProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [uploadInfo, setUploadInfo] = useState<UploadInfoType | null>(null);

  const contextValue = useMemo(
    () => ({ uploadInfo, setUploadInfo }),
    [uploadInfo],
  );

  return (
    <UploadInfoContext.Provider value={contextValue}>
      {children}
    </UploadInfoContext.Provider>
  );
};

export const useUploadInfo = () => {
  const context = useContext(UploadInfoContext);
  if (!context) {
    throw new Error(
      'useUploadInfo должен использоваться внутри UploadInfoProvider',
    );
  }
  return context;
};
