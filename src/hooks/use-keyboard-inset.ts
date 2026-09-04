import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from 'react-native';

/** Ignore URL-bar collapse and other small viewport jitter. */
export const MIN_WEB_KEYBOARD_INSET = 80;

function insetFromEvent(event: KeyboardEvent) {
  return Math.max(0, Math.round(event.endCoordinates.height));
}

/**
 * Covered height under the visual viewport (keyboard / browser chrome).
 * Returns 0 for small URL-bar jitter.
 */
export function measureWebKeyboardInset(
  viewport: VisualViewport,
  baselineHeight: number,
): number {
  const fromInner = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  const fromBaseline = Math.max(0, baselineHeight - viewport.height - viewport.offsetTop);
  const covered = Math.round(Math.max(fromInner, fromBaseline));
  return covered < MIN_WEB_KEYBOARD_INSET ? 0 : covered;
}

/**
 * Pin the document to the visual viewport so flex docks stay visible above
 * the mobile browser keyboard. Pass null to restore.
 */
export function pinWebDocumentToVisualViewport(
  viewport: VisualViewport | null,
  active: boolean,
) {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');

  if (!active || !viewport) {
    html.style.height = '';
    html.style.overflow = '';
    if (body) {
      body.style.height = '';
      body.style.overflow = '';
      body.style.transform = '';
    }
    if (root) {
      root.style.height = '';
    }
    return;
  }

  const h = `${Math.round(viewport.height)}px`;
  const translate =
    viewport.offsetTop > 0 ? `translateY(${Math.round(viewport.offsetTop)}px)` : '';

  html.style.height = h;
  html.style.overflow = 'hidden';
  if (body) {
    body.style.height = h;
    body.style.overflow = 'hidden';
    body.style.transform = translate;
  }
  if (root) {
    root.style.height = '100%';
  }

  window.scrollTo(0, 0);
}

/**
 * Space taken from the bottom of the screen by the system keyboard
 * (or the mobile browser chrome / on-screen keyboard).
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const viewport = window.visualViewport;
      if (!viewport) {
        return;
      }

      let baselineHeight = window.innerHeight;
      let baselineWidth = window.innerWidth;

      const sync = () => {
        if (window.innerWidth !== baselineWidth) {
          baselineWidth = window.innerWidth;
          baselineHeight = window.innerHeight;
        }

        const covered = measureWebKeyboardInset(viewport, baselineHeight);
        if (covered === 0) {
          baselineHeight = Math.max(window.innerHeight, Math.round(viewport.height));
        }
        setInset(covered);
      };

      viewport.addEventListener('resize', sync);
      viewport.addEventListener('scroll', sync);
      window.addEventListener('resize', sync);
      sync();

      return () => {
        viewport.removeEventListener('resize', sync);
        viewport.removeEventListener('scroll', sync);
        window.removeEventListener('resize', sync);
      };
    }

    const animateIos = (event?: KeyboardEvent) => {
      if (Platform.OS !== 'ios') return;
      LayoutAnimation.configureNext({
        duration: event?.duration || 250,
        update: { type: LayoutAnimation.Types.keyboard },
      });
    };

    const apply = (event: KeyboardEvent) => {
      animateIos(event);
      setInset(insetFromEvent(event));
    };

    const clear = (event: KeyboardEvent) => {
      animateIos(event);
      setInset(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, apply);
    const hide = Keyboard.addListener(hideEvent, clear);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}

/**
 * On web, pin the document to visualViewport while the keyboard covers the
 * bottom of the layout viewport. No-op on native.
 */
export function useWebKeyboardViewportPin(keyboardInset: number) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const sync = () => {
      const active = keyboardInset > 0;
      pinWebDocumentToVisualViewport(viewport, active);
    };

    sync();
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);

    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      pinWebDocumentToVisualViewport(null, false);
    };
  }, [keyboardInset]);
}
