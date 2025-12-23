export function parseExpression(expr: string, label: string) {
  const regex =
    /^\s*(\w+)\s*\(\s*(\w+)\s*\)\s*\/\s*(\w+)\s*\(\s*(\w+)\s*\)\s*$/i;

  const match = expr.match(regex);

  if (!match) {
    throw new Error(`Invalid expression: ${expr}`);
  }

  const [, numAggr, numLabel, denomAggr, denomLabel] = match;

  return {
    label,
    num: {
      aggr: numAggr.toLowerCase(),
      label: numLabel,
    },
    denom: {
      aggr: denomAggr.toLowerCase(),
      label: denomLabel,
    },
  };
}
