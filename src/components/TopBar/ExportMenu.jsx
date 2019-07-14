import {t} from 'i18next';
import tap from 'lodash-es/tap';
import PropTypes from 'prop-types';
import React from 'react';

import createMenu, {MenuItem} from './createMenu';
import ExportMenuButton from './ExportMenuButton';

const ExportMenu = createMenu({
  menuClass: 'top-bar__menu_right',
  buttonClass: 'top-bar__menu-button_primary top-bar__menu-button_export',
  name: 'export',

  renderItems({
    hasExportedRepo,
    isExperimental,
    isGistExportInProgress,
    isRepoExportInProgress,
    isClassroomExportInProgress,
    isUserAuthenticatedWithGithub,
    isUserAuthenticatedWithGoogle,
    onExportGist,
    onExportRepo,
    onUpdateRepo,
    onExportToClassroom,
    onOpenAssignmentCreator,
  }) {
    return tap([], items => {
      items.push(
        <MenuItem
          isDisabled={isClassroomExportInProgress}
          key="exportToClassroom"
          onClick={onExportToClassroom}
        >
          {t('top-bar.share-to-classroom')}
        </MenuItem>,
      );

      if (isUserAuthenticatedWithGithub) {
        items.push(
          <MenuItem
            idDisabled={isGistExportInProgress}
            key="exportGist"
            onClick={onExportGist}
          >
            {t('top-bar.export-gist')}
          </MenuItem>,
        );

        if (hasExportedRepo) {
          items.push(
            <MenuItem
              isDisabled={isRepoExportInProgress}
              key="updateRepo"
              onClick={onUpdateRepo}
            >
              {t('top-bar.update-repo')}
            </MenuItem>,
          );
        } else {
          items.push(
            <MenuItem
              isDisabled={isRepoExportInProgress}
              key="exportRepo"
              onClick={onExportRepo}
            >
              {t('top-bar.export-repo')}
            </MenuItem>,
          );
        }
      }
      if (isUserAuthenticatedWithGoogle && isExperimental) {
        items.push(
          <MenuItem key="assignmentCreatorr" onClick={onOpenAssignmentCreator}>
            {t('top-bar.create-assignment')}
          </MenuItem>,
        );
      }
    });
  },
})(ExportMenuButton);

ExportMenu.propTypes = {
  hasExportedRepo: PropTypes.bool.isRequired,
  isClassroomExportInProgress: PropTypes.bool.isRequired,
  isExperimental: PropTypes.bool.isRequired,
  isGistExportInProgress: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isRepoExportInProgress: PropTypes.bool.isRequired,
  isUserAuthenticatedWithGithub: PropTypes.bool.isRequired,
  isUserAuthenticatedWithGoogle: PropTypes.bool.isRequired,
  onExportGist: PropTypes.func.isRequired,
  onExportRepo: PropTypes.func.isRequired,
  onExportToClassroom: PropTypes.func.isRequired,
  onOpenAssignmentCreator: PropTypes.func.isRequired,
  onUpdateRepo: PropTypes.func.isRequired,
};

export default ExportMenu;
