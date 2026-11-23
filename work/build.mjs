// Bravus Work — build sem dependências.
// O código-fonte fica dividido por área em src/ (01-base.js … 21-inicializacao.js).
// Este script junta os arquivos, em ordem, no app.js que o navegador carrega.
// Uso:  node work/build.mjs          (gera app.js)
//       node work/build.mjs --check  (só confere se app.js está atualizado; usado no GitHub Actions)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(join(root, 'src')).filter(f => /^\d{2}-.+\.js$/.test(f)).sort();
const out = files.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('');
new Function(out); // erro de sintaxe para o build aqui, antes de ir para o ar

const target = join(root, 'app.js');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== out) { console.error('app.js desatualizado: rode  node work/build.mjs  e faça commit.'); process.exit(1); }
  console.log(`app.js em dia (${files.length} módulos).`);
} else {
  writeFileSync(target, out);
  console.log(`app.js gerado a partir de ${files.length} módulos (${(out.length / 1024).toFixed(0)} KB).`);
}
