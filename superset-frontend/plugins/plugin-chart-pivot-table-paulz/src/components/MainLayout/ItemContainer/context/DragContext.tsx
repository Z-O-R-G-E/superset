import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface DragContextType {
  isDragging: boolean;
  setDragging: (v: boolean) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDragContext = () => {
  const ctx = useContext(DragContext);
  if (!ctx) {
    throw new Error('useDragContext must be used within DragProvider');
  }
  return ctx;
};

export const DragProvider = ({ children }: { children: ReactNode }) => {
  const [isDragging, setDragging] = useState(false);

  const value = useMemo(() => ({ isDragging, setDragging }), [isDragging]);

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};
