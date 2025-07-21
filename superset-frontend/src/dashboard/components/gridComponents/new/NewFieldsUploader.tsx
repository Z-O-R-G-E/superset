import { t } from '@superset-ui/core';

import { useSelector } from 'react-redux';
import { FIELDS_UPLOADER_TYPE } from '../../../util/componentTypes';
import { NEW_FIELDS_UPLOADER_ID } from '../../../util/constants';
import DraggableNewComponent from './DraggableNewComponent';
import { UserWithPermissionsAndRoles } from '../../../../types/bootstrapTypes';
import { isUserAdmin } from '../../../util/permissionUtils';
import { findPermission } from '../../../../utils/findPermission';

const DraggableNewDivider = () => {
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const userValues = user || {};
  const { roles } = userValues;
  const isAdmin = isUserAdmin(user);
  const allowUploads = findPermission('can_fields_upload', 'Database', roles);
  const showUploads = allowUploads || isAdmin;

  return showUploads ? (
    <DraggableNewComponent
      id={NEW_FIELDS_UPLOADER_ID}
      type={FIELDS_UPLOADER_TYPE}
      label={t('Fields uploader')}
      className="fa fa-upload"
    />
  ) : null;
};

export default DraggableNewDivider;
