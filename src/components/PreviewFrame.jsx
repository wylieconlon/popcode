import Channel from 'jschannel';
import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import bindAll from 'lodash-es/bindAll';
import constant from 'lodash-es/constant';
import {t} from 'i18next';

import bowser from '../services/bowser';
import {createError} from '../util/errorUtils';
import retryingFailedImports from '../util/retryingFailedImports';
import {sourceDelimiter} from '../util/compileProject';
import {CompiledProject as CompiledProjectRecord} from '../records';

const sandboxOptions = [
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-scripts',
  'allow-top-navigation',
].join(' ');

let nextId = 1;

class PreviewFrame extends React.Component {
  constructor(props) {
    super(props);

    const {
      compiledProject: {source},
    } = props;

    bindAll(this, '_attachToFrame', '_handleInfiniteLoop');

    this.render = constant(
      <div className="preview__frame-container">
        <iframe
          className="preview__frame"
          name={`preview-frame-${nextId++}`}
          ref={this._attachToFrame}
          sandbox={sandboxOptions}
          srcDoc={source}
        />
      </div>,
    );
  }

  componentDidUpdate({consoleEntries: prevConsoleEntries}) {
    const {consoleEntries, isActive} = this.props;

    if (this._channel && isActive) {
      for (const [key, {expression}] of consoleEntries) {
        if (!prevConsoleEntries.has(key) && expression) {
          this._evaluateConsoleExpression(key, expression);
        }
      }
    }
  }

  async _evaluateConsoleExpression(key, expression) {
    const {hasExpressionStatement} = await retryingFailedImports(() =>
      import(
        /* webpackChunkName: "mainAsync" */
        '../util/javascript'
      ),
    );
    // eslint-disable-next-line prefer-reflect
    this._channel.call({
      method: 'evaluateExpression',
      params: expression,
      success: printedResult => {
        this.props.onConsoleValue(
          key,
          hasExpressionStatement(expression) ? printedResult : null,
          this.props.compiledProject.compiledProjectKey,
        );
      },
      error: (name, message) => {
        const normalizedError = createError({name, message});

        this.props.onConsoleError(
          key,
          this.props.compiledProject.compiledProjectKey,
          {
            name,
            reason: normalizedError.type,
            text: normalizedError.message,
            raw: normalizedError.message,
            type: 'error',
          },
        );
      },
    });
  }

  _runtimeErrorLineOffset() {
    const firstSourceLine =
      this.props.compiledProject.source.split('\n').indexOf(sourceDelimiter) +
      2;

    return firstSourceLine - 1;
  }

  _handleErrorMessage(error) {
    let line = error.line - this._runtimeErrorLineOffset();

    if (error.message === 'Loop Broken!') {
      this._handleInfiniteLoop(line);
      return;
    }

    const normalizedError = createError(error);

    if (bowser.is('Safari')) {
      line = 1;
    }

    this.props.onRuntimeError({
      reason: normalizedError.type,
      text: normalizedError.message,
      raw: normalizedError.message,
      row: line - 1,
      column: error.column,
      type: 'error',
    });
  }

  _handleInfiniteLoop(line) {
    const message = t('errors.javascriptRuntime.infinite-loop');
    this.props.onRuntimeError({
      reason: 'infinite-loop',
      text: message,
      raw: message,
      row: line - 1,
      column: 0,
      type: 'error',
    });
  }

  _handleConsoleLog(printedValue) {
    const {compiledProjectKey} = this.props.compiledProject;
    this.props.onConsoleLog(printedValue, compiledProjectKey);
  }

  _attachToFrame(frame) {
    if (!frame) {
      if (this._channel) {
        this._channel.destroy();
        Reflect.deleteProperty(this, '_channel');
      }
      return;
    }

    this._channel = Channel.build({
      window: frame.contentWindow,
      origin: '*',
      onReady() {
        frame.classList.add('preview__frame_loaded');
      },
    });

    this._channel.bind('error', (_trans, params) => {
      if (this.props.isActive) {
        this._handleErrorMessage(params);
      }
    });
    this._channel.bind('log', (_trans, params) => {
      if (this.props.isActive) {
        this._handleConsoleLog(params);
      }
    });
  }
}

PreviewFrame.propTypes = {
  compiledProject: PropTypes.instanceOf(CompiledProjectRecord).isRequired,
  consoleEntries: ImmutablePropTypes.iterable.isRequired,
  isActive: PropTypes.bool.isRequired,
  onConsoleError: PropTypes.func.isRequired,
  onConsoleLog: PropTypes.func.isRequired,
  onConsoleValue: PropTypes.func.isRequired,
  onRuntimeError: PropTypes.func.isRequired,
};

export default PreviewFrame;
