import { useCallback, useState, useMemo } from 'react';
import { useComponentState } from '../../../../../../contexts/ComponentStateContext';
import { useUploadFieldsManagement } from '../../../../hooks/useUploadFieldsManagement';
import { GRID_MIN_COLUMN_COUNT } from '../../../../../../../../../util/constants';

export const useUploadFieldResize = (
  index: number,
  width: number | undefined,
) => {
  const [resizing, setResizing] = useState(false);
  const { setDisableDragDrop, widthMultiple, columnWidth } =
    useComponentState();
  const { onWidthChange } = useUploadFieldsManagement();

  const normalizedWidth = useMemo(
    () =>
      Math.min(
        Math.max(width ?? GRID_MIN_COLUMN_COUNT, GRID_MIN_COLUMN_COUNT),
        widthMultiple - 1,
      ),
    [width, widthMultiple],
  );

  const handleResizeStart = useCallback(() => {
    setResizing(true);
    setDisableDragDrop(true);
  }, [setDisableDragDrop]);

  const handleResizeStop = useCallback(
    ({ widthMultiple: newWidthRaw }: { widthMultiple: number }) => {
      const newWidth = Math.min(newWidthRaw, widthMultiple - 1);
      if (newWidth !== width) {
        onWidthChange(index, newWidth);
      }
      setDisableDragDrop(false);
      setResizing(false);
    },
    [index, onWidthChange, setDisableDragDrop, widthMultiple, width],
  );

  return {
    resizing,
    normalizedWidth,
    columnWidth,
    handleResizeStart,
    handleResizeStop,
  };
};
