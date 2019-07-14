import React from 'react';
import PropTypes from 'prop-types';

import bindAll from 'lodash-es/bindAll';
import constant from 'lodash-es/constant';
import get from 'lodash-es/get';
import throttle from 'lodash-es/throttle';
import noop from 'lodash-es/noop';

import {EditorLocation} from '../records';
import {createAceEditor, createAceSessionWithoutWorker} from '../util/ace';

import 'brace/ext/searchbox';
import 'brace/mode/html';
import 'brace/mode/css';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

const RESIZE_THROTTLE = 250;
const NORMAL_FONTSIZE = 14;
const LARGE_FONTSIZE = 20;

class Editor extends React.Component {
  constructor() {
    super();

    this._handleWindowResize = throttle(() => {
      if (this._editor) {
        this._resizeEditor();
      }
    }, RESIZE_THROTTLE);

    bindAll(this, '_handleWindowResize', '_resizeEditor', '_setupEditor');

    this.render = constant(
      <div className="editors__editor" ref={this._setupEditor} />,
    );
  }

  componentDidMount() {
    this._focusRequestedLine(this.props.requestedFocusedLine);
    this._applyFontSize(this.props.textSizeIsLarge);
    window.addEventListener('resize', this._handleWindowResize);
  }

  componentDidUpdate({
    percentageOfHeight: prevPercentageOfHeight,
    projectKey: prevProjectKey,
    source: prevSource,
  }) {
    const {
      errors,
      percentageOfHeight,
      projectKey,
      requestedFocusedLine,
      source,
      textSizeIsLarge,
    } = this.props;

    if (projectKey !== prevProjectKey) {
      this._startNewSession(source);
    } else if (source !== prevSource && source !== this._editor.getValue()) {
      this._editor.setValue(source, 1);
    }

    this._focusRequestedLine(requestedFocusedLine);
    this._applyFontSize(textSizeIsLarge);

    if (percentageOfHeight !== prevPercentageOfHeight) {
      requestAnimationFrame(this._resizeEditor);
    }

    this._editor.getSession().setAnnotations(errors);
  }

  componentWillUnmount() {
    this._editor.destroy();
    window.removeEventListener('resize', this._handleWindowResize);
  }

  _focusRequestedLine(requestedFocusedLine) {
    if (
      get(requestedFocusedLine, 'component') !== `editor.${this.props.language}`
    ) {
      return;
    }

    this._editor.moveCursorTo(
      requestedFocusedLine.line,
      requestedFocusedLine.column,
    );

    this._scrollToLine(requestedFocusedLine.line);
    this._editor.focus();
    this.props.onRequestedLineFocused();
  }

  _resizeEditor() {
    this._editor.resize();
  }

  _scrollToLine(lineNumber) {
    const shouldCenterVertically = true;
    const shouldAnimate = true;
    this._editor.scrollToLine(
      lineNumber,
      shouldCenterVertically,
      shouldAnimate,
      noop,
    );
  }

  _setupEditor(containerElement) {
    if (containerElement) {
      this._editor = createAceEditor(containerElement);
      this._startNewSession(this.props.source);
      this._resizeEditor();
      this._editor.on('focus', this._resizeEditor);
      this._editor.commands.addCommand({
        name: 'autoFormat',
        bindKey: {win: 'Ctrl-i', mac: 'Command-i'},
        exec: () => {
          this.props.onAutoFormat();
        },
      });
    } else {
      this._editor.destroy();
    }
  }

  _applyFontSize(textSizeIsLarge) {
    if (textSizeIsLarge) {
      this._editor.setFontSize(LARGE_FONTSIZE);
    } else {
      this._editor.setFontSize(NORMAL_FONTSIZE);
    }
  }

  _startNewSession(source) {
    const session = createAceSessionWithoutWorker(this.props.language, source);
    session.on('change', () => {
      this.props.onInput(this._editor.getValue());
    });
    session.setAnnotations(this.props.errors);
    this._editor.setSession(session);
    this._editor.moveCursorTo(0, 0);
    this._resizeEditor();
  }
}

Editor.propTypes = {
  errors: PropTypes.array.isRequired,
  language: PropTypes.string.isRequired,
  percentageOfHeight: PropTypes.number.isRequired,
  projectKey: PropTypes.string.isRequired,
  requestedFocusedLine: PropTypes.instanceOf(EditorLocation),
  source: PropTypes.string.isRequired,
  textSizeIsLarge: PropTypes.bool.isRequired,
  onAutoFormat: PropTypes.func.isRequired,
  onInput: PropTypes.func.isRequired,
  onRequestedLineFocused: PropTypes.func.isRequired,
};

Editor.defaultProps = {
  requestedFocusedLine: null,
  textSizeIsLarge: false,
};

export default Editor;
