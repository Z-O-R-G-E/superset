import { PureComponent } from 'react';
import { TableRenderer } from './TableRenderers';

class PivotTable extends PureComponent {
  render() {
    return <TableRenderer {...this.props} />;
  }
}

PivotTable.propTypes = TableRenderer.propTypes;
PivotTable.defaultProps = TableRenderer.defaultProps;

export default PivotTable;
