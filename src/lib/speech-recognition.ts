import { Platform } from 'react-native';

import { isExpoGo } from '@/lib/ocr-availability';

type WebSpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechCallbacks = {
  onListeningChange: (listening: boolean) => void;
  onTranscript: (text: string) => void;
};

type NativeSpeechApi = {
  isRecognitionAvailable: () => boolean | Promise<boolean>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
  }) => Promise<void>;
  stop: () => void;
  addListener: (
    eventName: string,
    listener: (event: { results?: { transcript?: string }[] }) => void,
  ) => { remove: () => void };
};

let nativeSpeechApi: NativeSpeechApi | null | undefined;

async function loadNativeSpeechApi(): Promise<NativeSpeechApi | null> {
  if (nativeSpeechApi !== undefined) return nativeSpeechApi;
  if (Platform.OS === 'web' || isExpoGo()) {
    nativeSpeechApi = null;
    return null;
  }
  try {
    const loaded = await import('expo-speech-recognition');
    const module = (loaded as { ExpoSpeechRecognitionModule?: NativeSpeechApi })
      .ExpoSpeechRecognitionModule;
    if (!module || typeof module.isRecognitionAvailable !== 'function') {
      nativeSpeechApi = null;
      return null;
    }
    nativeSpeechApi = module;
    return nativeSpeechApi;
  } catch {
    nativeSpeechApi = null;
    return null;
  }
}

export async function startSpeechRecognition(
  callbacks: SpeechCallbacks,
): Promise<{ stop: () => void } | null> {
  try {
    if (Platform.OS === 'web') {
      return startWebSpeech(callbacks);
    }

    const module = await loadNativeSpeechApi();
    if (!module) return null;

    const available = await Promise.resolve(module.isRecognitionAvailable());
    if (!available) return null;

    const permission = await module.requestPermissionsAsync();
    if (!permission.granted) return null;

    let transcript = '';
    const subscriptions = [
      module.addListener('start', () => {
        transcript = '';
        callbacks.onListeningChange(true);
      }),
      module.addListener('result', (event) => {
        transcript = event.results?.[0]?.transcript ?? '';
      }),
      module.addListener('end', () => {
        callbacks.onListeningChange(false);
        const finalText = transcript.trim();
        if (finalText) callbacks.onTranscript(finalText);
        transcript = '';
        subscriptions.forEach((sub) => sub.remove());
      }),
      module.addListener('error', () => {
        callbacks.onListeningChange(false);
        subscriptions.forEach((sub) => sub.remove());
      }),
    ];

    try {
      await module.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      subscriptions.forEach((sub) => sub.remove());
      return null;
    }

    return {
      stop: () => {
        try {
          module.stop();
        } catch {
          // Already stopped.
        }
      },
    };
  } catch {
    return null;
  }
}

function startWebSpeech(callbacks: SpeechCallbacks): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const win = window as unknown as {
    SpeechRecognition?: new () => WebSpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
  };
  const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  callbacks.onListeningChange(true);
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript ?? '';
    if (text.trim()) callbacks.onTranscript(text.trim());
  };
  recognition.onend = () => callbacks.onListeningChange(false);
  recognition.onerror = () => callbacks.onListeningChange(false);
  recognition.start();

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    },
  };
}

export async function isSpeechRecognitionSupported(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return !!(win.SpeechRecognition ?? win.webkitSpeechRecognition);
  }
  const module = await loadNativeSpeechApi();
  if (!module) return false;
  try {
    return await Promise.resolve(module.isRecognitionAvailable());
  } catch {
    return false;
  }
}
