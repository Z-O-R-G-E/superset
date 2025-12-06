import { JsonObject, t } from '@superset-ui/core';
import { ReactNode, MouseEvent } from 'react';

const parseLabel = (value: unknown) => {
  if (typeof value === 'string') {
    if (value === 'metric') return t('metric');
    return value;
  }
  if (typeof value === 'number') {
    return value;
  }
  return String(value);
};

export function displayHeaderCell(
  needToggle: boolean,
  ArrowIcon: ReactNode,
  onArrowClick: ((e: MouseEvent) => void) | null,
  value: string,
  namesMapping: JsonObject,
) {
  const name = namesMapping[value] || value;
  return needToggle ? (
    <span className="toggle-wrapper">
      <span
        role="button"
        tabIndex={0}
        className="toggle"
        onClick={(e: MouseEvent) => onArrowClick?.(e)}
      >
        {ArrowIcon}
      </span>
      <span className="toggle-val">{parseLabel(name)}</span>
    </span>
  ) : (
    parseLabel(name)
  );
}
