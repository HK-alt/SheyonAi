import { useEffect, useRef, useState } from 'react';

export function useTypingPlaceholder(phrases: readonly string[], paused: boolean) {
  const [text, setText] = useState('');
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    if (paused) return;

    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const list = phrasesRef.current;
      if (list.length === 0) return;
      const phrase = list[indexRef.current % list.length] ?? list[0];
      if (!phrase) return;
      if (deletingRef.current) {
        charRef.current -= 1;
        setText(phrase.slice(0, Math.max(0, charRef.current)));
        if (charRef.current <= 0) {
          deletingRef.current = false;
          indexRef.current = (indexRef.current + 1) % list.length;
          timeout = setTimeout(tick, 280);
          return;
        }
        timeout = setTimeout(tick, 28);
        return;
      }

      charRef.current += 1;
      setText(phrase.slice(0, charRef.current));
      if (charRef.current >= phrase.length) {
        deletingRef.current = true;
        timeout = setTimeout(tick, 1600);
        return;
      }
      timeout = setTimeout(tick, 58);
    };

    timeout = setTimeout(tick, 240);
    return () => clearTimeout(timeout);
  }, [paused]);

  return text;
}
