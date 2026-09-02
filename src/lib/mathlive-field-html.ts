const MATHLIVE_CDN = 'https://cdn.jsdelivr.net/npm/mathlive@0.110.0';

export type MathLiveFieldTheme = {
  text: string;
  textSecondary: string;
  accent: string;
  accentMuted: string;
};

/** MathLive page hosted in the native composer WebView. */
export function buildMathLiveFieldHtml(options: {
  placeholder: string;
  displayMode: boolean;
  theme: MathLiveFieldTheme;
}): string {
  const placeholder = JSON.stringify(options.placeholder);
  const fontSize = options.displayMode ? '26px' : '20px';
  const minHeight = options.displayMode ? '64px' : '48px';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="${MATHLIVE_CDN}/mathlive.min.js"></script>
  <script>
    const MFE = window.MathfieldElement || (window.MathLive && window.MathLive.MathfieldElement);
    if (MFE) {
      MFE.fontsDirectory = '${MATHLIVE_CDN}/fonts';
      MFE.soundsDirectory = null;
    }
  </script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
    }
    math-field {
      display: block;
      width: 100%;
      box-sizing: border-box;
      min-height: ${minHeight};
      padding: 8px 10px;
      font-size: ${fontSize};
      border: none;
      outline: none;
      background: transparent;
      color: ${options.theme.text};
      --caret-color: ${options.theme.accent};
      --selection-background-color: ${options.theme.accentMuted};
      --placeholder-color: ${options.theme.textSecondary};
      --contains-highlight-background-color: ${options.theme.accentMuted};
    }
    math-field::part(virtual-keyboard-toggle),
    math-field::part(menu-toggle) {
      display: none;
    }
    math-virtual-keyboard {
      display: none !important;
    }
  </style>
</head>
<body>
  <math-field id="mf" tabIndex="0"></math-field>
  <script>
    (function () {
      const mf = document.getElementById('mf');
      if (!mf) return;
      mf.mathVirtualKeyboardPolicy = 'manual';
      mf.smartMode = false;
      mf.smartFence = true;
      mf.mathModeSpace = '\\:';
      mf.menuItems = [];
      mf.placeholder = ${placeholder};
      mf.tabIndex = 0;

      const hideMathKeyboard = () => {
        try {
          mf.executeCommand('hideVirtualKeyboard');
          if (window.mathVirtualKeyboard) {
            window.mathVirtualKeyboard.visible = false;
            window.mathVirtualKeyboard.hide({ animate: false });
          }
        } catch (e) {}
      };

      const post = (payload) => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };

      const focusField = () => {
        hideMathKeyboard();
        mf.focus();
        try {
          var inner = mf.shadowRoot && mf.shadowRoot.querySelector('textarea, input, [contenteditable="true"]');
          if (inner) inner.focus();
        } catch (e) {}
      };

      const reportSize = () => {
        const rect = mf.getBoundingClientRect();
        const height = Math.ceil(Math.max(mf.scrollHeight || 0, rect.height || 0, 52));
        post({ type: 'size', height: height });
      };

      mf.addEventListener('input', function () {
        post({ type: 'input', value: mf.value || '' });
        reportSize();
      });
      mf.addEventListener('focus', function () {
        hideMathKeyboard();
        post({ type: 'focused' });
      });
      mf.addEventListener('selection-change', reportSize);
      window.addEventListener('load', reportSize);
      document.addEventListener('pointerdown', focusField);
      setTimeout(reportSize, 60);
      setTimeout(focusField, 0);

      window.__evoMathComposer = function (msg) {
        if (!msg || !msg.type) return;
        if (msg.type === 'setValue') {
          var next = typeof msg.value === 'string' ? msg.value : '';
          if (mf.value !== next) {
            mf.setValue(next, { silenceNotifications: true });
            reportSize();
          }
          return;
        }
        if (msg.type === 'insert') {
          mf.insert(msg.latex || '', {
            insertionMode: 'replaceSelection',
            selectionMode: 'placeholder',
            focus: true,
            scrollIntoView: true
          });
          post({ type: 'input', value: mf.value || '' });
          reportSize();
          return;
        }
        if (msg.type === 'typed') {
          var text = String(msg.text || '');
          for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (ch === ' ' || ch === '\u00a0') {
              mf.executeCommand(['insert', mf.mathModeSpace || '\\:']);
            } else {
              mf.executeCommand(['typedText', ch, { focus: true, feedback: false, simulateKeystroke: true }]);
            }
          }
          post({ type: 'input', value: mf.value || '' });
          reportSize();
          return;
        }
        if (msg.type === 'backspace') {
          mf.executeCommand('deleteBackward');
          post({ type: 'input', value: mf.value || '' });
          reportSize();
          return;
        }
        if (msg.type === 'next') {
          mf.executeCommand('moveToNextPlaceholder');
          focusField();
          return;
        }
        if (msg.type === 'focus') {
          focusField();
        }
      };

        if (window.mathVirtualKeyboard) {
          window.mathVirtualKeyboard.addEventListener('before-virtual-keyboard-toggle', function (ev) {
            if (ev.detail && ev.detail.visible) ev.preventDefault();
          });
        }
        hideMathKeyboard();
      post({ type: 'ready' });
      focusField();
    })();
  </script>
</body>
</html>`;
}
