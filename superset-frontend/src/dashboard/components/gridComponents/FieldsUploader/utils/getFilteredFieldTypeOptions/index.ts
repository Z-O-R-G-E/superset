import { FieldTypeOptions } from '../../constants';
import { SubdType } from '../../types';

export const getFilteredFieldTypeOptions = (subd: SubdType) =>
  FieldTypeOptions.map(group => ({
    ...group,
    options: group.options.filter(option => option.supportedDBs.includes(subd)),
  })).filter(group => group.options.length > 0);
