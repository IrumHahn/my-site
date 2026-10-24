#!/usr/bin/env node
// 새 상품 추가 CLI (에이전트·사람 공용). shop/products.json 에 상품을 추가하고 node build.mjs 를 실행합니다.
//
//   node scripts/new-product.mjs --id my-item --name "상품명" --price 12000 --category blend \
//        [--sub "한 줄 설명"] [--stock 20] [--image assets/img/p-my-item.jpg] [--tags "특징1,특징2"] \
//        [--spec "항목 | 값" --spec "..."] [--story "스토리"] [--tip "사용 팁"] [--badge NEW] [--featured] \
//        [--options size,grind] [--detail-file detail.html] [--update] [--no-build]
//   node scripts/new-product.mjs --json product.json      # products.json 의 products[] 한 항목과 같은 형식
//   echo '{"id":...}' | node scripts/new-product.mjs --json -
//
// --image 를 생략하면 assets/img/p-<id>.svg 플레이스홀더를 build 가 만들어 둡니다. 나중에 실제 이미지로 바꾸고 경로만 고치세요.
// --detail-file 을 주면 shop/details/<id>.html 로 복사되어 상세 페이지 하단에 끼워 넣어집니다.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(root, 'shop', 'products.json');

function parseArgs(argv) {
  const out = { _: [], spec: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const k = a.slice(2);
    if (['update', 'no-build', 'help', 'featured'].includes(k)) { out[k] = true; continue; }
    const v = argv[++i];
    if (k === 'spec') out.spec.push(v); else out[k] = v;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.id && !args.json)) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(args.help ? 0 : 1);
}

const data = JSON.parse(readFileSync(FILE, 'utf8'));
let p;
if (args.json) {
  p = JSON.parse(args.json === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(args.json), 'utf8'));
} else {
  p = {
    id: args.id, name: args.name, sub: args.sub || '', category: args.category, price: args.price != null ? +args.price : undefined, unit: args.unit || '',
    image: args.image, tags: args.tags ? args.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    specs: args.spec.map((l) => { const i = l.indexOf('|'); return { k: (i < 0 ? l : l.slice(0, i)).trim(), v: i < 0 ? '' : l.slice(i + 1).trim() }; }),
    stock: args.stock != null ? +args.stock : 10, badge: args.badge || '', featured: !!args.featured,
    options: args.options ? args.options.split(',').map((s) => s.trim()).filter(Boolean) : [],
    story: args.story || '', tip: args.tip || '',
  };
}
if (!p.id || !p.name || typeof p.price !== 'number' || isNaN(p.price)) { console.error('id, name, price 는 필수입니다'); process.exit(1); }
if (!/^[a-z0-9-]+$/.test(p.id)) { console.error('id 는 영문 소문자·숫자·하이픈만 쓸 수 있습니다 (파일명으로 쓰입니다)'); process.exit(1); }
if (!p.category) p.category = data.categories[0].id;
if (!data.categories.some((c) => c.id === p.category)) { console.error(`없는 카테고리입니다: ${p.category}  (가능: ${data.categories.map((c) => c.id).join(', ')})`); process.exit(1); }
for (const g of p.options || []) if (!data.options[g]) { console.error(`없는 옵션 그룹입니다: ${g}  (가능: ${Object.keys(data.options).join(', ')})`); process.exit(1); }
if (!p.image) p.image = `assets/img/p-${p.id}.svg`;

if (args['detail-file']) { mkdirSync(join(root, 'shop', 'details'), { recursive: true }); copyFileSync(resolve(args['detail-file']), join(root, 'shop', 'details', `${p.id}.html`)); }

const idx = data.products.findIndex((x) => x.id === p.id);
if (idx >= 0) {
  if (!args.update) { console.error(`같은 id 의 상품이 이미 있습니다: ${p.id}  (덮어쓰려면 --update)`); process.exit(1); }
  data.products[idx] = { ...data.products[idx], ...p };
} else data.products.push(p);
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`${idx >= 0 ? '수정' : '추가'}: ${p.name} (${p.price.toLocaleString('ko-KR')}원) → shop/products/${p.id}.html`);

if (!args['no-build']) execFileSync(process.execPath, [join(root, 'build.mjs')], { stdio: 'inherit' });
