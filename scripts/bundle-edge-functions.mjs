import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'supabase', 'functions');
const outDir = path.join(__dirname, '..', 'agent-tools');

function collect(fnName) {
  const entry = path.join(root, fnName, 'index.ts');
  const files = new Map();
  const queue = [entry];

  while (queue.length) {
    const file = queue.shift();
    if (files.has(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    files.set(file, content);
    const re = /from ['"](\.\.?\/[^'"]+)['"]/g;
    let match;
    while ((match = re.exec(content))) {
      let dep = path.normalize(path.join(path.dirname(file), match[1]));
      if (!dep.endsWith('.ts')) dep += '.ts';
      if (fs.existsSync(dep)) queue.push(dep);
    }
  }

  return [...files.entries()].map(([name, content]) => ({
    name: path.relative(root, name).replace(/\\/g, '/'),
    content,
  }));
}

fs.mkdirSync(outDir, { recursive: true });

for (const fn of ['deepseek-chat', 'web-search', 'ingest-url', 'rag-chat']) {
  const files = collect(fn);
  const bundle = {
    entrypoint: `${fn}/index.ts`,
    verify_jwt: fn !== 'deepseek-chat',
    files,
  };
  const out = path.join(outDir, `${fn}-bundle.json`);
  fs.writeFileSync(out, JSON.stringify(bundle));
  console.log(`${fn}: ${files.length} files -> ${out}`);
}
