export type SubjectPrompts = readonly [string, string, string, string];

export type SubjectIcon = {
  ios: string;
  android: string;
  web: string;
};

export type SubjectDefinition = {
  id: string;
  label: string;
  /** Optional Bhutanese or subject-specific greeting for empty state. */
  greeting?: string;
  /** Romanization for greeting script (e.g. kuzuzangpo la). */
  greetingRomanization?: string;
  placeholder: string;
  modeHint: string;
  prompts: SubjectPrompts;
  /** Appended to the base system prompt on the Edge Function. */
  tutorPrompt: string;
  icon: SubjectIcon;
};

export type SubjectConfig = Pick<
  SubjectDefinition,
  'label' | 'greeting' | 'greetingRomanization' | 'placeholder' | 'modeHint' | 'prompts' | 'tutorPrompt'
>;
