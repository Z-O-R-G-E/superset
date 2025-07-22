import { FieldTypeOptions } from '../../constants';
import { DbmsType } from '../../types';

export const getFilteredFieldTypeOptions = (dbms: DbmsType) =>
  FieldTypeOptions.map(group => ({
    ...group,
    options: group.options.filter(option => option.supportedDBs.includes(dbms)),
  })).filter(group => group.options.length > 0);
