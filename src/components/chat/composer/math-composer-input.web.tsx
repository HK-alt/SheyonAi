import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { MathfieldElement } from 'mathlive';

import { useTheme } from '@/hooks/use-theme';
import { previewLatex, toMathLiveInsert } from '@/lib/latex-insert';
import type { MathComposerHandle } from '@/components/chat/composer/types';

const MATHLIVE_FONTS = 'https://cdn.jsdelivr.net/npm/mathlive@0.110.0/fonts';

type MathfieldCtor = typeof import('mathlive').MathfieldElement;

let mathfieldCtor: MathfieldCtor | null = null;
let mathliveLoad: Promise<MathfieldCtor | null> | null = null;
let mathliveConfigured = false;

function injectComposerStyles() {
  if (typeof document === 'undefined' || document.getElementById('evo-mathlive-composer')) return;
  const style = document.createElement('style');
  style.id = 'evo-mathlive-composer';
  style.textContent =
    'math-field::part(virtual-keyboard-toggle), math-field::part(menu-toggle) { display: none; } math-virtual-keyboard { display: none !important; } .evo-math-composer:focus-within { outline: none; }';
  document.head.appendChild(style);
}

function configureMathLive(MathfieldElement: MathfieldCtor) {
  if (mathliveConfigured) return;
  mathliveConfigured = true;
  MathfieldElement.fontsDirectory = MATHLIVE_FONTS;
  MathfieldElement.soundsDirectory = null;
  window.mathVirtualKeyboard?.addEventListener('before-virtual-keyboard-toggle', (event) => {
    const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
    if (detail?.visible) event.preventDefault();
  });
  injectComposerStyles();
}

/** Load browser MathLive only in the DOM. Never import at module top — SSR has no HTMLElement. */
function loadMathLive(): Promise<MathfieldCtor | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (mathfieldCtor) return Promise.resolve(mathfieldCtor);
  if (!mathliveLoad) {
    mathliveLoad = import('mathlive')
      .then((mod) => {
        const ctor = mod.MathfieldElement;
        if (typeof ctor !== 'function') return null;
        mathfieldCtor = ctor;
        configureMathLive(ctor);
        return ctor;
      })
      .catch(() => null);
  }
  return mathliveLoad;
}

function ensureMathFieldDefined(MathfieldElement: MathfieldCtor) {
  if (typeof window === 'undefined' || typeof MathfieldElement !== 'function') return false;
  if (!window.customElements) return false;
  if (!window.customElements.get('math-field')) {
    try {
      window.customElements.define('math-field', MathfieldElement);
    } catch {
      // Already defined by a concurrent import / HMR race.
      if (!window.customElements.get('math-field')) return false;
    }
  }
  return true;
}

function createMathField(MathfieldElement: MathfieldCtor): MathfieldElement | null {
  if (!ensureMathFieldDefined(MathfieldElement)) return null;
  // Prefer createElement over `new MathfieldElement()`: Metro/HMR can leave the
  // imported class unregistered, which throws "Illegal constructor".
  return document.createElement('math-field') as MathfieldElement;
}

type MathComposerInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  displayMode?: boolean;
  onEnterSubmit?: () => void;
};

function hideMathLiveKeyboard(mf?: MathfieldElement | null) {
  try {
    mf?.executeCommand('hideVirtualKeyboard');
    window.mathVirtualKeyboard.visible = false;
    window.mathVirtualKeyboard.hide({ animate: false });
  } catch {
    // MathLive keyboard APIs are optional on first paint.
  }
}

function applyFieldStyles(mf: MathfieldElement, displayMode: boolean) {
  mf.tabIndex = 0;
  mf.style.display = 'block';
  mf.style.width = '100%';
  mf.style.flex = '1';
  mf.style.boxSizing = 'border-box';
  mf.style.minHeight = displayMode ? '64px' : '48px';
  mf.style.padding = '8px 10px';
  mf.style.fontSize = displayMode ? '26px' : '20px';
  mf.style.border = 'none';
  mf.style.outline = 'none';
  mf.style.background = 'transparent';
}

function applyFieldChrome(mf: MathfieldElement, displayMode: boolean) {
  applyFieldStyles(mf, displayMode);
  if (!mf.isConnected) return;
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.smartMode = false;
  mf.smartFence = true;
  mf.mathModeSpace = '\\:';
  try {
    mf.menuItems = [];
  } catch {
    // MathLive throws "Mathfield not mounted" if connectedCallback has not run.
  }
}

function focusMathField(mf: MathfieldElement | null) {
  if (!mf) return;
  hideMathLiveKeyboard(mf);
  mf.focus();
  const inner = mf.shadowRoot?.querySelector<HTMLElement>('textarea, input, [contenteditable="true"]');
  inner?.focus();
}

export const MathComposerInput = forwardRef<MathComposerHandle, MathComposerInputProps>(
  function MathComposerInput(
    {
      value,
      onChangeText,
      placeholder = 'Type or tap symbols to build an equation…',
      displayMode = true,
      onEnterSubmit,
    },
    ref,
  ) {
    const theme = useTheme();
    const mfRef = useRef<MathfieldElement | null>(null);
    const hostNodeRef = useRef<HTMLDivElement | null>(null);
    const mountGenRef = useRef(0);
    const onChangeRef = useRef(onChangeText);
    const onEnterSubmitRef = useRef(onEnterSubmit);
    const displayModeRef = useRef(displayMode);
    const placeholderRef = useRef(placeholder);
    const valueRef = useRef(value);
    onChangeRef.current = onChangeText;
    onEnterSubmitRef.current = onEnterSubmit;
    displayModeRef.current = displayMode;
    placeholderRef.current = placeholder;
    valueRef.current = value;

    const mountField = useCallback((node: HTMLDivElement, MathfieldElement: MathfieldCtor) => {
      const mf = createMathField(MathfieldElement);
      if (!mf) return;
      applyFieldStyles(mf, displayModeRef.current);
      mf.addEventListener('input', () => {
        onChangeRef.current(mf.value ?? '');
      });
      mf.addEventListener('focus', () => hideMathLiveKeyboard(mf));
      mf.addEventListener('keydown', (event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          onEnterSubmitRef.current?.();
        }
      });
      node.appendChild(mf);
      mfRef.current = mf;
      applyFieldChrome(mf, displayModeRef.current);
      mf.placeholder = placeholderRef.current;
      try {
        mf.setValue(previewLatex(valueRef.current), { silenceNotifications: true });
      } catch {
        requestAnimationFrame(() => {
          if (mfRef.current === mf) {
            mf.setValue(previewLatex(valueRef.current), { silenceNotifications: true });
          }
        });
      }
      hideMathLiveKeyboard(mf);
      requestAnimationFrame(() => focusMathField(mf));
      setTimeout(() => focusMathField(mf), 50);
      setTimeout(() => focusMathField(mf), 200);
    }, []);

    const attachHost = useCallback(
      (node: HTMLDivElement | null) => {
        if (!node) {
          mountGenRef.current += 1;
          mfRef.current?.remove();
          mfRef.current = null;
          hostNodeRef.current = null;
          return;
        }
        hostNodeRef.current = node;
        if (mfRef.current) {
          if (mfRef.current.parentElement !== node) {
            node.appendChild(mfRef.current);
          }
          requestAnimationFrame(() => focusMathField(mfRef.current));
          return;
        }

        const gen = ++mountGenRef.current;
        void loadMathLive().then((MathfieldElement) => {
          if (gen !== mountGenRef.current || hostNodeRef.current !== node || !MathfieldElement) return;
          if (mfRef.current) return;
          mountField(node, MathfieldElement);
        });
      },
      [mountField],
    );

    useEffect(() => {
      const mf = mfRef.current;
      if (!mf?.isConnected) return;
      applyFieldChrome(mf, displayMode);
      try {
        mf.placeholder = placeholder;
      } catch {
        // Placeholder can throw before MathLive finishes connecting.
      }
      mf.style.color = theme.text;
      mf.style.setProperty('--caret-color', theme.accent);
      mf.style.setProperty('--selection-background-color', theme.accentMuted);
      mf.style.setProperty('--placeholder-color', theme.textSecondary);
      mf.style.setProperty('--contains-highlight-background-color', theme.accentMuted);
    }, [displayMode, placeholder, theme.accent, theme.accentMuted, theme.text, theme.textSecondary]);

    useEffect(() => {
      const mf = mfRef.current;
      if (!mf?.isConnected) return;
      const next = previewLatex(value);
      try {
        if (mf.value !== next) {
          mf.setValue(next, { silenceNotifications: true });
        }
      } catch {
        // Ignore until the field is fully mounted.
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        focusMathField(mfRef.current);
      },
      insertLatex: (snippet: string) => {
        mfRef.current?.insert(toMathLiveInsert(snippet), {
          insertionMode: 'replaceSelection',
          selectionMode: 'placeholder',
          focus: true,
          scrollIntoView: true,
        });
        focusMathField(mfRef.current);
      },
      jumpNextPlaceholder: () => {
        mfRef.current?.executeCommand('moveToNextPlaceholder');
        focusMathField(mfRef.current);
      },
      deleteBackward: () => {
        mfRef.current?.executeCommand('deleteBackward');
        focusMathField(mfRef.current);
      },
    }));

    return createElement('div', {
      ref: attachHost,
      className: 'evo-math-composer',
      role: 'textbox',
      tabIndex: 0,
      'aria-label': 'Editable equation',
      onPointerDown: () => focusMathField(mfRef.current),
      onClick: () => focusMathField(mfRef.current),
      style: {
        flex: 1,
        minWidth: 0,
        minHeight: 56,
        display: 'flex',
        alignItems: 'stretch',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: theme.composerBorder,
        backgroundColor: theme.composerBackground,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'text',
      },
    });
  },
);
