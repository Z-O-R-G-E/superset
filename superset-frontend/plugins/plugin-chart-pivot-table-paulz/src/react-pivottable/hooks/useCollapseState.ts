import { useState, useCallback } from 'react';
import { flatKey } from '../utilities';

export function useCollapseState() {
  const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>(
    {},
  );
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>(
    {},
  );

  const collapseAttr = useCallback(
    (rowOrCol: boolean, attrIdx: number, allKeys: any[]) =>
      (e?: MouseEvent) => {
        e?.stopPropagation();
        const keyLen = attrIdx + 1;
        const collapsed = allKeys.filter(k => k.length === keyLen).map(flatKey);
        const updates = {};
        collapsed.forEach(k => {
          updates[k] = true;
        });
        if (rowOrCol) {
          setCollapsedRows(s => ({ ...s, ...updates }));
        } else {
          setCollapsedCols(s => ({ ...s, ...updates }));
        }
      },
    [],
  );

  const expandAttr = useCallback(
    (rowOrCol: boolean, attrIdx: number, allKeys: any[]) =>
      (e?: MouseEvent) => {
        e?.stopPropagation();
        const updates = {};
        allKeys.forEach(k => {
          for (let i = 0; i <= attrIdx; i += 1) {
            updates[flatKey(k.slice(0, i + 1))] = false;
          }
        });
        if (rowOrCol) {
          setCollapsedRows(s => ({ ...s, ...updates }));
        } else {
          setCollapsedCols(s => ({ ...s, ...updates }));
        }
      },
    [],
  );

  const toggleRowKey = useCallback(
    (flatRowKey: string) => (e?: MouseEvent) => {
      e?.stopPropagation();
      setCollapsedRows(prev => ({ ...prev, [flatRowKey]: !prev[flatRowKey] }));
    },
    [],
  );

  const toggleColKey = useCallback(
    (flatColKey: string) => (e?: MouseEvent) => {
      e?.stopPropagation();
      setCollapsedCols(prev => ({ ...prev, [flatColKey]: !prev[flatColKey] }));
    },
    [],
  );

  return {
    collapsedRows,
    collapsedCols,
    toggleRowKey,
    toggleColKey,
    collapseAttr,
    expandAttr,
  };
}
