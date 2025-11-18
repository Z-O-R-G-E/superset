import { ComponentProps, FC } from 'react';
import { TableRenderer } from './TableRenderers';

type PivotTableProps = ComponentProps<typeof TableRenderer>;

const PivotTable: FC<PivotTableProps> = props => <TableRenderer {...props} />;

PivotTable.propTypes = TableRenderer.propTypes;
PivotTable.defaultProps = TableRenderer.defaultProps;

export default PivotTable;
