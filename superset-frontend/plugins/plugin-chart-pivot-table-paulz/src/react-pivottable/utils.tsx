import { t } from '@superset-ui/core';

export const parseLabel = (value: unknown) => {
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
  ArrowIcon: React.ReactNode,
  onArrowClick: ((e: React.MouseEvent) => void) | null,
  value: unknown,
  namesMapping: Record<string, string> = {},
) {
  const name = namesMapping[value as string] || value;
  return needToggle ? (
    <span className="toggle-wrapper">
      <span
        role="button"
        tabIndex={0}
        className="toggle"
        onClick={onArrowClick ?? undefined}
      >
        {ArrowIcon}
      </span>
      <span className="toggle-val">{parseLabel(name)}</span>
    </span>
  ) : (
    parseLabel(name)
  );
}
