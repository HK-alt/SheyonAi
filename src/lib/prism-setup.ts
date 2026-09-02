import Prism from 'prismjs';

let languagesLoaded = false;

/** Register Prism grammars once. Uses require() so global Prism is set before plugins load (Metro-safe). */
export function ensurePrismLanguages() {
  if (languagesLoaded) return;

  const globalScope = globalThis as typeof globalThis & { Prism?: typeof Prism };
  globalScope.Prism = Prism;

  // Order matters — each grammar depends on earlier ones.
  require('prismjs/components/prism-clike');
  require('prismjs/components/prism-c');
  require('prismjs/components/prism-javascript');
  require('prismjs/components/prism-markup');
  require('prismjs/components/prism-css');
  require('prismjs/components/prism-scss');
  require('prismjs/components/prism-less');
  require('prismjs/components/prism-cpp');
  require('prismjs/components/prism-typescript');
  require('prismjs/components/prism-jsx');
  require('prismjs/components/prism-tsx');
  require('prismjs/components/prism-bash');
  require('prismjs/components/prism-docker');
  require('prismjs/components/prism-go');
  require('prismjs/components/prism-java');
  require('prismjs/components/prism-json');
  require('prismjs/components/prism-markdown');
  require('prismjs/components/prism-python');
  require('prismjs/components/prism-rust');
  require('prismjs/components/prism-sql');
  require('prismjs/components/prism-yaml');
  require('prismjs/components/prism-markup-templating');
  require('prismjs/components/prism-php');
  require('prismjs/components/prism-ruby');
  require('prismjs/components/prism-kotlin');
  require('prismjs/components/prism-swift');
  require('prismjs/components/prism-csharp');
  require('prismjs/components/prism-graphql');
  require('prismjs/components/prism-diff');
  require('prismjs/components/prism-nginx');
  require('prismjs/components/prism-powershell');

  languagesLoaded = true;
}

export { Prism };
