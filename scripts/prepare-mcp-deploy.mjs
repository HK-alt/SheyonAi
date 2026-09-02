import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectId = 'lfsacmdqjxtwgxqftrlh';
const bundleDir = path.join(__dirname, '..', 'agent-tools');

for (const fn of ['web-search', 'ingest-url', 'rag-chat', 'deepseek-chat']) {
  const bundle = JSON.parse(fs.readFileSync(path.join(bundleDir, `${fn}-bundle.json`), 'utf8'));
  const payload = {
    project_id: projectId,
    name: fn,
    entrypoint_path: bundle.entrypoint,
    verify_jwt: bundle.verify_jwt,
    files: bundle.files,
  };
  fs.writeFileSync(path.join(bundleDir, `deploy-${fn}.json`), JSON.stringify(payload));
  console.log(`deploy-${fn}.json`, Math.round(JSON.stringify(payload).length / 1024), 'KB');
}
