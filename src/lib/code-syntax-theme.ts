export type SyntaxTheme = {
  plain: string;
  keyword: string;
  string: string;
  comment: string;
  function: string;
  number: string;
  operator: string;
  punctuation: string;
  boolean: string;
  builtin: string;
  className: string;
  tag: string;
  attrName: string;
  attrValue: string;
  regex: string;
  variable: string;
  property: string;
};

/** VS Code Light+ inspired — tuned for #FAFAFC code panels */
export const SYNTAX_LIGHT: SyntaxTheme = {
  plain: '#24292F',
  keyword: '#AF00DB',
  string: '#A31515',
  comment: '#6A737D',
  function: '#795E26',
  number: '#098658',
  operator: '#24292F',
  punctuation: '#586069',
  boolean: '#0000FF',
  builtin: '#267F99',
  className: '#267F99',
  tag: '#800000',
  attrName: '#E50000',
  attrValue: '#0451A5',
  regex: '#811F3F',
  variable: '#001080',
  property: '#001080',
};

/** VS Code Dark+ inspired — tuned for #161618 code panels */
export const SYNTAX_DARK: SyntaxTheme = {
  plain: '#D4D4D4',
  keyword: '#569CD6',
  string: '#CE9178',
  comment: '#6A9955',
  function: '#DCDCAA',
  number: '#B5CEA8',
  operator: '#D4D4D4',
  punctuation: '#808080',
  boolean: '#569CD6',
  builtin: '#4EC9B0',
  className: '#4EC9B0',
  tag: '#569CD6',
  attrName: '#9CDCFE',
  attrValue: '#CE9178',
  regex: '#D16969',
  variable: '#9CDCFE',
  property: '#9CDCFE',
};

export type LanguageMeta = {
  label: string;
  accent: string;
  prismId: string;
};

export const LANGUAGE_META: Record<string, LanguageMeta> = {
  javascript: { label: 'JavaScript', accent: '#F7DF1E', prismId: 'javascript' },
  typescript: { label: 'TypeScript', accent: '#3178C6', prismId: 'typescript' },
  jsx: { label: 'JSX', accent: '#61DAFB', prismId: 'jsx' },
  tsx: { label: 'TSX', accent: '#3178C6', prismId: 'tsx' },
  python: { label: 'Python', accent: '#3776AB', prismId: 'python' },
  json: { label: 'JSON', accent: '#CBAA4E', prismId: 'json' },
  bash: { label: 'Bash', accent: '#4EAA25', prismId: 'bash' },
  sql: { label: 'SQL', accent: '#336791', prismId: 'sql' },
  css: { label: 'CSS', accent: '#1572B6', prismId: 'css' },
  html: { label: 'HTML', accent: '#E34F26', prismId: 'markup' },
  markup: { label: 'HTML', accent: '#E34F26', prismId: 'markup' },
  xml: { label: 'XML', accent: '#E34F26', prismId: 'markup' },
  svg: { label: 'SVG', accent: '#FFB13B', prismId: 'markup' },
  markdown: { label: 'Markdown', accent: '#083FA1', prismId: 'markdown' },
  java: { label: 'Java', accent: '#ED8B00', prismId: 'java' },
  go: { label: 'Go', accent: '#00ADD8', prismId: 'go' },
  rust: { label: 'Rust', accent: '#DEA584', prismId: 'rust' },
  cpp: { label: 'C++', accent: '#00599C', prismId: 'cpp' },
  c: { label: 'C', accent: '#A8B9CC', prismId: 'cpp' },
  yaml: { label: 'YAML', accent: '#CB171E', prismId: 'yaml' },
  docker: { label: 'Docker', accent: '#2496ED', prismId: 'docker' },
  dockerfile: { label: 'Docker', accent: '#2496ED', prismId: 'docker' },
  scss: { label: 'SCSS', accent: '#CD6799', prismId: 'scss' },
  sass: { label: 'Sass', accent: '#CD6799', prismId: 'scss' },
  less: { label: 'Less', accent: '#1D365D', prismId: 'less' },
  php: { label: 'PHP', accent: '#777BB4', prismId: 'php' },
  ruby: { label: 'Ruby', accent: '#CC342D', prismId: 'ruby' },
  rb: { label: 'Ruby', accent: '#CC342D', prismId: 'ruby' },
  kotlin: { label: 'Kotlin', accent: '#7F52FF', prismId: 'kotlin' },
  kt: { label: 'Kotlin', accent: '#7F52FF', prismId: 'kotlin' },
  swift: { label: 'Swift', accent: '#F05138', prismId: 'swift' },
  csharp: { label: 'C#', accent: '#512BD4', prismId: 'csharp' },
  cs: { label: 'C#', accent: '#512BD4', prismId: 'csharp' },
  graphql: { label: 'GraphQL', accent: '#E10098', prismId: 'graphql' },
  gql: { label: 'GraphQL', accent: '#E10098', prismId: 'graphql' },
  nginx: { label: 'Nginx', accent: '#009639', prismId: 'nginx' },
  powershell: { label: 'PowerShell', accent: '#5391FE', prismId: 'powershell' },
  ps1: { label: 'PowerShell', accent: '#5391FE', prismId: 'powershell' },
  diff: { label: 'Diff', accent: '#6B7280', prismId: 'diff' },
  plaintext: { label: 'Code', accent: '#6B7280', prismId: 'plain' },
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  xml: 'html',
  htm: 'html',
  'c++': 'cpp',
  code: 'plaintext',
  text: 'plaintext',
  plain: 'plaintext',
  txt: 'plaintext',
};

export function resolveLanguage(raw: string): LanguageMeta {
  const normalized = raw.trim().toLowerCase().split(/[\s{[(]/)[0] ?? '';
  const key = LANGUAGE_ALIASES[normalized] ?? normalized;
  return LANGUAGE_META[key] ?? { label: normalized || 'Code', accent: '#6B7280', prismId: key || 'plain' };
}

const TOKEN_COLOR_MAP: Record<string, keyof SyntaxTheme> = {
  keyword: 'keyword',
  string: 'string',
  char: 'string',
  comment: 'comment',
  function: 'function',
  'function-variable': 'function',
  'function-name': 'function',
  number: 'number',
  operator: 'operator',
  punctuation: 'punctuation',
  boolean: 'boolean',
  builtin: 'builtin',
  'builtin-name': 'builtin',
  'class-name': 'className',
  'maybe-class-name': 'className',
  tag: 'tag',
  'doctype-tag': 'tag',
  style: 'tag',
  script: 'tag',
  'attr-name': 'attrName',
  'attr-value': 'attrValue',
  'style-attr': 'attrName',
  'style-string': 'attrValue',
  'attr-equals': 'operator',
  regex: 'regex',
  'regex-delimiter': 'regex',
  'regex-flags': 'regex',
  'regex-source': 'regex',
  variable: 'variable',
  'variable-language': 'keyword',
  property: 'property',
  'literal-property': 'property',
  important: 'keyword',
  constant: 'number',
  symbol: 'variable',
  selector: 'tag',
  'selector-function-argument': 'tag',
  url: 'string',
  entity: 'function',
  'named-entity': 'variable',
  inserted: 'string',
  deleted: 'comment',
  interpolation: 'string',
  'template-string': 'string',
  namespace: 'className',
  decorator: 'function',
  parameter: 'variable',
  prolog: 'comment',
  doctype: 'tag',
  cdata: 'comment',
  atrule: 'keyword',
  rule: 'property',
  unit: 'number',
  hexcode: 'number',
  color: 'number',
  bold: 'keyword',
  italic: 'comment',
  strike: 'comment',
  underline: 'comment',
  'script-punctuation': 'punctuation',
  spread: 'operator',
  arrow: 'operator',
  'generic-function': 'function',
  'generic-class': 'className',
  'type-annotation': 'className',
  'type-hint': 'className',
  'directive-hash': 'keyword',
  directive: 'keyword',
  'triple-quoted-string': 'string',
  fstring: 'string',
  escape: 'string',
  'escape-sequence': 'string',
  module: 'className',
  package: 'className',
  self: 'variable',
  this: 'variable',
  null: 'boolean',
  undefined: 'boolean',
  console: 'builtin',
  language: 'className',
  title: 'function',
  section: 'function',
  list: 'keyword',
  blockquote: 'comment',
  code: 'string',
  'code-snippet': 'string',
  command: 'function',
  heredoc: 'string',
  'heredoc-delimiter': 'string',
  'heredoc-string': 'string',
  diff: 'operator',
  prefix: 'operator',
  suffix: 'operator',
  id: 'property',
  class: 'className',
  combinator: 'operator',
  'pseudo-class': 'keyword',
  'pseudo-element': 'keyword',
  media: 'keyword',
  include: 'keyword',
  name: 'attrName',
  value: 'attrValue',
  'special-attr': 'attrName',
  'included-cdata': 'comment',
};

const TOKEN_COLOR_FALLBACKS: [RegExp, keyof SyntaxTheme][] = [
  [/attr-equals/, 'operator'],
  [/^language-/, 'plain'],
  [/comment|prolog|cdata|blockquote|heredoc/, 'comment'],
  [/keyword|atrule|directive|important|pseudo-/, 'keyword'],
  [/function/, 'function'],
  [/string|char|url|fstring/, 'string'],
  [/number|constant|unit|hexcode|color/, 'number'],
  [/class/, 'className'],
  [/tag|selector|doctype/, 'tag'],
  [/attr-value|^value$/, 'attrValue'],
  [/attr-name|^name$|special-attr/, 'attrName'],
  [/regex/, 'regex'],
  [/variable/, 'variable'],
  [/property|^rule$/, 'property'],
  [/builtin/, 'builtin'],
  [/operator|spread|arrow|combinator|diff/, 'operator'],
  [/punctuation/, 'punctuation'],
  [/entity/, 'function'],
];

function tokenParts(type: string): string[] {
  return type.split(/\s+/).filter(Boolean);
}

export function colorForToken(type: string, syntax: SyntaxTheme): string {
  const parts = tokenParts(type);

  for (const part of parts) {
    const mapped = TOKEN_COLOR_MAP[part];
    if (mapped) return syntax[mapped];
  }

  for (const [pattern, key] of TOKEN_COLOR_FALLBACKS) {
    if (parts.some((part) => pattern.test(part)) || pattern.test(type)) {
      return syntax[key];
    }
  }

  return syntax.plain;
}

export type TokenStyle = {
  color: string;
  fontStyle?: 'italic' | 'normal';
  fontWeight?: '400' | '500' | '600' | '700';
};

export function styleForToken(type: string, syntax: SyntaxTheme): TokenStyle {
  const color = colorForToken(type, syntax);
  const parts = tokenParts(type);
  const italicTypes = new Set([
    'comment',
    'prolog',
    'cdata',
    'blockquote',
    'italic',
    'strike',
    'underline',
    'deleted',
    'included-cdata',
  ]);
  const boldTypes = new Set(['important', 'bold', 'keyword', 'doctype-tag']);

  const fontStyle =
    parts.some((part) => italicTypes.has(part) || part.includes('comment')) ? 'italic' : undefined;
  const fontWeight =
    parts.some((part) => boldTypes.has(part) || (part.includes('keyword') && !part.includes('comment')))
      ? '600'
      : undefined;

  return { color, fontStyle, fontWeight };
}
