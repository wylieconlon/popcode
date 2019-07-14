import Immutable from 'immutable';
import assign from 'lodash-es/assign';
import isNil from 'lodash-es/isNil';
import filter from 'lodash-es/filter';
import find from 'lodash-es/find';
import get from 'lodash-es/get';
import map from 'lodash-es/map';
import sortBy from 'lodash-es/sortBy';
import values from 'lodash-es/values';

import {Project} from '../records';
import {isPristineProject} from '../util/projectUtils';
import ProjectSources from '../records/ProjectSources';

const emptyMap = new Immutable.Map();

function addProject(state, project) {
  return state.set(
    project.projectKey,
    Project.fromJS(project).update('hiddenUIComponents', components =>
      components.add('console'),
    ),
  );
}

function removePristineExcept(state, keepProjectKey) {
  return state.filter(
    (project, projectKey) =>
      projectKey === keepProjectKey || !isPristineProject(project),
  );
}

function unhideComponent(state, projectKey, component, timestamp) {
  return state
    .updateIn([projectKey, 'hiddenUIComponents'], hiddenUIComponents =>
      hiddenUIComponents.delete(component),
    )
    .setIn([projectKey, 'updatedAt'], timestamp);
}

function contentForLanguage(files, language) {
  const filesForLanguage = sortBy(
    filter(files, {language}),
    file => file.filename,
  );
  return map(filesForLanguage, 'content').join('\n\n');
}

function importGist(state, projectKey, gistData) {
  const files = values(gistData.files);
  const popcodeJsonFile = find(files, {filename: 'popcode.json'});
  const popcodeJson = JSON.parse(get(popcodeJsonFile, 'content', '{}'));

  return addProject(state, {
    projectKey,
    sources: {
      html: get(find(files, {language: 'HTML'}), 'content', ''),
      css: contentForLanguage(files, 'CSS'),
      javascript: contentForLanguage(files, 'JavaScript'),
    },
    enabledLibraries: popcodeJson.enabledLibraries || [],
    hiddenUIComponents: popcodeJson.hiddenUIComponents || [],
    instructions: contentForLanguage(files, 'Markdown'),
    isArchived: false,
  });
}

export function reduceRoot(stateIn, action) {
  return stateIn.update('projects', projects => {
    switch (action.type) {
      case 'USER_LOGGED_OUT': {
        const currentProjectKey = stateIn.getIn([
          'currentProject',
          'projectKey',
        ]);

        if (isNil(currentProjectKey)) {
          return new Immutable.Map();
        }

        return new Immutable.Map().set(
          currentProjectKey,
          projects.get(currentProjectKey),
        );
      }
      case 'FOCUS_LINE':
        return unhideComponent(
          projects,
          stateIn.getIn(['currentProject', 'projectKey']),
          action.payload.component,
          action.meta.timestamp,
        );
    }
    return projects;
  });
}

export default function reduceProjects(stateIn, action) {
  let state;

  if (stateIn === undefined) {
    state = emptyMap;
  } else {
    state = stateIn;
  }

  switch (action.type) {
    case 'PROJECTS_LOADED':
      return action.payload.reduce(addProject, state);

    case 'ACCOUNT_MIGRATION_COMPLETE':
      return action.payload.projects.reduce(addProject, state);

    case 'UPDATE_PROJECT_SOURCE':
      return state
        .setIn(
          [action.payload.projectKey, 'sources', action.payload.language],
          action.payload.newValue,
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'PROJECT_BEAUTIFIED':
      return state
        .setIn(
          [action.payload.projectKey, 'sources'],
          new ProjectSources(action.payload.projectSources),
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'UPDATE_PROJECT_INSTRUCTIONS':
      return state
        .setIn(
          [action.payload.projectKey, 'instructions'],
          action.payload.newValue,
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'PROJECT_CREATED':
      return removePristineExcept(state, action.payload.projectKey).set(
        action.payload.projectKey,
        new Project({projectKey: action.payload.projectKey}),
      );

    case 'CHANGE_CURRENT_PROJECT':
      return removePristineExcept(state, action.payload.projectKey).setIn(
        [action.payload.projectKey, 'isArchived'],
        false,
      );

    case 'SNAPSHOT_IMPORTED':
      return addProject(
        state,
        assign({}, action.payload.project, {
          projectKey: action.payload.projectKey,
          updatedAt: null,
        }),
      );

    case 'GIST_IMPORTED':
      return importGist(
        state,
        action.payload.projectKey,
        action.payload.gistData,
      );

    case 'PROJECT_RESTORED_FROM_LAST_SESSION':
      return addProject(state, action.payload);

    case 'TOGGLE_LIBRARY':
      return state
        .updateIn(
          [action.payload.projectKey, 'enabledLibraries'],
          enabledLibraries => {
            const {libraryKey} = action.payload;
            if (enabledLibraries.has(libraryKey)) {
              return enabledLibraries.delete(libraryKey);
            }
            return enabledLibraries.add(libraryKey);
          },
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'HIDE_COMPONENT':
      return state
        .updateIn(
          [action.payload.projectKey, 'hiddenUIComponents'],
          hiddenUIComponents =>
            hiddenUIComponents.add(action.payload.componentName),
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'UNHIDE_COMPONENT':
      return unhideComponent(
        state,
        action.payload.projectKey,
        action.payload.componentName,
        action.meta.timestamp,
      );

    case 'TOGGLE_COMPONENT':
      return state
        .updateIn(
          [action.payload.projectKey, 'hiddenUIComponents'],
          hiddenUIComponents => {
            const {componentName} = action.payload;
            if (hiddenUIComponents.includes(componentName)) {
              return hiddenUIComponents.remove(action.payload.componentName);
            }
            return hiddenUIComponents.add(action.payload.componentName);
          },
        )
        .setIn([action.payload.projectKey, 'updatedAt'], action.meta.timestamp);

    case 'START_EDITING_INSTRUCTIONS':
      return unhideComponent(
        state,
        action.payload.projectKey,
        'instructions',
        action.meta.timestamp,
      );

    case 'PROJECT_EXPORTED':
      if (
        action.payload.exportType === 'repo' &&
        action.payload.exportData.name
      ) {
        return state
          .setIn(
            [action.payload.projectKey, 'externalLocations', 'githubRepoName'],
            action.payload.exportData.name,
          )
          .setIn(
            [action.payload.projectKey, 'updatedAt'],
            action.meta.timestamp,
          );
      }
      return state;

    case 'ARCHIVE_PROJECT':
      return state.setIn([action.payload.projectKey, 'isArchived'], true);

    default:
      return state;
  }
}
