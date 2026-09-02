import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LEARNING_LEVEL,
  isLearningLevel,
  type LearningLevel,
} from '@/lib/learning-level';

const STORAGE_KEY = 'sheyonai.appSettings.v1';

export type AppSettings = {
  /** Show starter prompt chips on empty chat. */
  showSuggestions: boolean;
  /** Web: Enter sends the message; Shift+Enter inserts a newline. */
  sendOnEnter: boolean;
  /** Global learning level for AI replies. */
  learningLevel: LearningLevel;
};

const DEFAULTS: AppSettings = {
  showSuggestions: true,
  sendOnEnter: true,
  learningLevel: DEFAULT_LEARNING_LEVEL,
};

type AppSettingsContextValue = AppSettings & {
  setShowSuggestions: (value: boolean) => void;
  setSendOnEnter: (value: boolean) => void;
  setLearningLevel: (value: LearningLevel) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function normalize(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  const data = raw as Partial<AppSettings>;
  return {
    showSuggestions:
      typeof data.showSuggestions === 'boolean' ? data.showSuggestions : DEFAULTS.showSuggestions,
    sendOnEnter: typeof data.sendOnEnter === 'boolean' ? data.sendOnEnter : DEFAULTS.sendOnEnter,
    learningLevel: isLearningLevel(data.learningLevel) ? data.learningLevel : DEFAULTS.learningLevel,
  };
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          setSettings(normalize(JSON.parse(stored)));
        } catch {
          // Keep defaults.
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: AppSettings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      persist({ ...settings, ...partial });
    },
    [persist, settings],
  );

  const setShowSuggestions = useCallback(
    (value: boolean) => updateSettings({ showSuggestions: value }),
    [updateSettings],
  );

  const setSendOnEnter = useCallback(
    (value: boolean) => updateSettings({ sendOnEnter: value }),
    [updateSettings],
  );

  const setLearningLevel = useCallback(
    (value: LearningLevel) => updateSettings({ learningLevel: value }),
    [updateSettings],
  );

  const value = useMemo(
    () => ({
      ...settings,
      setShowSuggestions,
      setSendOnEnter,
      setLearningLevel,
      updateSettings,
    }),
    [settings, setShowSuggestions, setSendOnEnter, setLearningLevel, updateSettings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
