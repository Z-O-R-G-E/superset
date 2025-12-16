import { ItemType } from '../../types';

export const cloneItem = (item: ItemType) =>
  typeof item === 'object' && item !== null ? { ...item } : item;
