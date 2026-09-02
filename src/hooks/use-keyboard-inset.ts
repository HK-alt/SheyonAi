import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from 'react-native';

function insetFromEvent(event: KeyboardEvent) {
  return Math.max(0, Math.round(event.endCoordinates.height));
}

/**
 * Space taken from the bottom of the screen by the system keyboard
 * (or the mobile browser chrome / on-screen keyboard).
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;
      const sync = () => {
        const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        setInset(Math.round(covered));
      };
      viewport.addEventListener('resize', sync);
      viewport.addEventListener('scroll', sync);
      sync();
      return () => {
        viewport.removeEventListener('resize', sync);
        viewport.removeEventListener('scroll', sync);
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
