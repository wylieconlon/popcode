import test from 'tape-catch';
import {testSaga} from 'redux-saga-test-plan';
import {
  userDoneTyping as userDoneTypingSaga,
  exportProject as exportProjectSaga,
  popOutProject as popOutProjectSaga,
  projectSuccessfullySaved as projectSuccessfullySavedSaga,
} from '../../../src/sagas/ui';
import {getCurrentProject} from '../../../src/selectors';
import {
  userDoneTyping,
  popOutProject,
  showSaveIndicator,
  hideSaveIndicator,
} from '../../../src/actions/ui';
import {
  projectExported,
  projectExportDisplayed,
  projectExportError,
  projectExportNotDisplayed,
} from '../../../src/actions/clients';
import {openWindowWithContent} from '../../../src/util';
import spinnerPageHtml from '../../../templates/project-export.html';
import compileProject from '../../../src/util/compileProject';

test('userDoneTyping', assert => {
  testSaga(userDoneTypingSaga)
    .next()
    .put(userDoneTyping())
    .next()
    .isDone();
  assert.end();
});

test('exportProject', t => {
  t.test('with window still open', assert => {
    const mockWindow = {closed: false, location: {}};
    const url = 'https://gist.github.com/abc123';
    const exportType = 'gist';
    testSaga(exportProjectSaga)
      .next()
      .call(openWindowWithContent, spinnerPageHtml)
      .next(mockWindow)
      .take(['PROJECT_EXPORTED', 'PROJECT_EXPORT_ERROR'])
      .next(projectExported(url, exportType))
      .put(projectExportDisplayed())
      .next()
      .isDone();

    assert.equal(mockWindow.location.href, url);

    assert.end();
  });

  t.test('with window closed', assert => {
    const mockWindow = {closed: true, location: {}};
    const url = 'https://gist.github.com/abc123';
    const exportType = 'gist';
    testSaga(exportProjectSaga)
      .next()
      .call(openWindowWithContent, spinnerPageHtml)
      .next(mockWindow)
      .take(['PROJECT_EXPORTED', 'PROJECT_EXPORT_ERROR'])
      .next(projectExported(url, exportType))
      .put(projectExportNotDisplayed(url, exportType))
      .next()
      .isDone();

    assert.notOk(mockWindow.location.href);

    assert.end();
  });

  t.test('with project export error', assert => {
    const mockWindow = {closed: false, close() {}};
    const exportType = 'gist';
    testSaga(exportProjectSaga)
      .next()
      .call(openWindowWithContent, spinnerPageHtml)
      .next(mockWindow)
      .take(['PROJECT_EXPORTED', 'PROJECT_EXPORT_ERROR'])
      .next(projectExportError(exportType))
      .call([mockWindow, 'close'])
      .next()
      .isDone();

    assert.end();
  });
});

test('popOutProject', assert => {
  const mockWindow = {closed: false, close() {}};
  const project = {};
  const preview = {src: '<html></html>'};
  testSaga(popOutProjectSaga, popOutProject())
    .next()
    .select(getCurrentProject)
    .next(project)
    .call(compileProject, project)
    .next({source: preview})
    .call(openWindowWithContent, preview)
    .next(mockWindow)
    .isDone();
  assert.end();
});

test('projectSuccessfullySaved', assert => {
  testSaga(projectSuccessfullySavedSaga)
    .next()
    .put(showSaveIndicator())
    .next()
    .delay(1000)
    .next()
    .put(hideSaveIndicator())
    .next()
    .isDone();
  assert.end();
});
