// node --test tests/build.test.mjs   (또는 npm test)
// 빌드가 모든 산출물을 만들고, 카드가 HTML 에 직접 구워지고(JS 아님), sitemap/llms 에 글·상품이 들어가는지 확인합니다.
// 프로젝트를 임시 폴더에 복사해서 빌드하므로 작업 폴더를 건드리지 않습니다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let dir;
const read = (p) => readFileSync(join(dir, p), 'utf8');
const build = () => execFileSync(process.execPath, [join(dir, 'build.mjs')], { encoding: 'utf8' });

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'my-site-'));
  cpSync(src, dir, { recursive: true, filter: (p) => !/\/(\.git|node_modules)(\/|$)/.test(p) });
  build();
});
after(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

const site = JSON.parse(readFileSync(join(src, 'site.json'), 'utf8'));
const products = JSON.parse(readFileSync(join(src, 'shop/products.json'), 'utf8')).products;
const posts = JSON.parse(readFileSync(join(src, 'blog/posts.json'), 'utf8'));

test('모든 산출물이 생성된다', () => {
  for (const f of ['index.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'assets/theme.css', 'assets/img/og.svg', 'shop/data.js', 'shop/index.html', 'blog/index.html', 'blog/feed.xml'])
    assert.ok(existsSync(join(dir, f)), `${f} 가 없습니다`);
  for (const p of products) { assert.ok(existsSync(join(dir, `shop/products/${p.id}.html`)), `shop/products/${p.id}.html 없음`); assert.ok(existsSync(join(dir, p.image)), `${p.image} (플레이스홀더) 없음`); }
  for (const p of posts) assert.ok(existsSync(join(dir, `blog/${p.slug || p.id}.html`)), `blog/${p.slug || p.id}.html 없음`);
});

test('홈에 상품 카드 3개 · 글 카드 3개가 HTML 로 구워져 있다 (JS 아님)', () => {
  const html = read('index.html');
  assert.equal((html.match(/data-product-card=/g) || []).length, 3);
  assert.equal((html.match(/data-post-card=/g) || []).length, 3);
  const featured = products.filter((p) => p.featured).slice(0, 3);
  for (const p of featured) assert.ok(html.includes(`shop/products/${p.id}.html`) && html.includes(p.name), `대표 상품 ${p.name} 이 홈에 없음`);
  const latest = posts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  for (const p of latest) assert.ok(html.includes(p.title), `최신 글 ${p.title} 이 홈에 없음`);
  assert.ok(html.includes(site.brand) && html.includes(site.tagline), 'site.json 브랜드/한줄소개가 홈에 없음');
  assert.ok(html.includes('"@type":"Organization"'), 'Organization JSON-LD 없음');
});

test('스토어 목록·블로그 목록에 전 항목이 구워져 있다', () => {
  const shop = read('shop/index.html');
  assert.equal((shop.match(/data-product-card=/g) || []).length, products.length);
  assert.ok(shop.includes('"@type":"ItemList"'));
  const blog = read('blog/index.html');
  assert.equal((blog.match(/data-post-card=/g) || []).length, posts.length);
  assert.ok(!/fetch\(/.test(blog), '블로그 목록이 fetch 로 그려지고 있음');
});

test('상품 상세: title/meta/JSON-LD · 옵션 · 상세 오버라이드', () => {
  const p = products.find((x) => x.id === 'dawn-blend');
  const html = read('shop/products/dawn-blend.html');
  assert.ok(html.includes(`<title>${p.name} | ${site.brand}</title>`));
  assert.ok(html.includes(`<link rel="canonical" href="${site.baseUrl}shop/products/dawn-blend.html">`));
  assert.ok(html.includes('"@type":"Product"') && html.includes('"@type":"BreadcrumbList"'));
  assert.ok(html.includes('name="opt-size"') && html.includes('name="opt-grind"'), '옵션 라디오 없음');
  assert.ok(html.includes('<!-- DETAIL:START') && html.includes('새벽 5시, 첫 잔을 기준으로'), 'shop/details/dawn-blend.html 이 끼워 넣어지지 않음');
  const noDetail = read('shop/products/noon-blend.html');
  assert.ok(!noDetail.includes('<!-- DETAIL:START'));
  // 옵션 없는 상품 카드엔 button[data-add] 만 (라디오 data-add 충돌 방지 규칙)
  const shop = read('shop/index.html');
  assert.ok(/<button[^>]*data-add="dripbag-7"/.test(shop));
  assert.ok(!/<input[^>]*data-add=/.test(html));
});

test('블로그 글: title/description/canonical/OG · BlogPosting+FAQPage+Breadcrumb · 작성자/수정일/FAQ/출처', () => {
  const p = posts.find((x) => x.slug === 'how-to-store-beans');
  const html = read('blog/how-to-store-beans.html');
  assert.ok(html.includes(`<title>${p.title} | ${site.brand}</title>`));
  assert.ok(html.includes(`<meta name="description" content="${p.summary}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${site.baseUrl}blog/how-to-store-beans.html">`));
  assert.ok(html.includes('<meta property="og:type" content="article">'));
  for (const t of ['BlogPosting', 'FAQPage', 'BreadcrumbList']) assert.ok(html.includes(`"@type":"${t}"`), `${t} JSON-LD 없음`);
  assert.ok(html.includes(p.author) && html.includes('수정 2026. 9. 2.'));
  assert.ok(html.includes('<section class="faq">') && html.includes(p.faq[0].q));
  assert.ok(html.includes('참고·출처') && html.includes(p.sources[0].url));
  assert.ok(html.includes('<h2>세 가지 원칙</h2>') && html.includes('<ul><li>'), '초경량 마크다운 변환 실패');
});

test('sitemap · llms.txt · feed.xml · robots 에 글과 상품이 들어간다', () => {
  const sm = read('sitemap.xml'), llms = read('llms.txt'), feed = read('blog/feed.xml'), robots = read('robots.txt');
  for (const p of products) { assert.ok(sm.includes(`${site.baseUrl}shop/products/${p.id}.html`)); assert.ok(llms.includes(p.name)); }
  for (const p of posts) { assert.ok(sm.includes(`${site.baseUrl}blog/${p.slug}.html`)); assert.ok(llms.includes(p.title)); assert.ok(feed.includes(`<title>${p.title}</title>`)); }
  assert.ok(robots.includes('Disallow: /admin/') && robots.includes(`Sitemap: ${site.baseUrl}sitemap.xml`));
});

test('헤더·푸터·테마가 site.json 을 따라간다 (멱등)', () => {
  const first = read('shop/checkout.html');
  build();
  assert.equal(read('shop/checkout.html'), first, '두 번 빌드하면 결과가 달라짐');
  assert.ok(read('assets/theme.css').includes(`--ink: ${site.colors.primary}`));
  for (const f of ['shop/checkout.html', 'shop/track.html', 'shop/support.html', 'blog/index.html', 'blog/post.html']) {
    const h = read(f);
    assert.ok(h.includes('<header class="site-header">') && h.includes('<footer class="site-footer">'), `${f} 헤더/푸터 없음`);
    assert.ok(h.includes(`data-root="../shop/" data-site="../"`), `${f} data-root/site 잘못됨`);
  }
  // site.json 을 바꾸면 다음 빌드에 반영
  const s2 = { ...site, brand: '테스트 브랜드', colors: { ...site.colors, primary: '#123456' } };
  writeFileSync(join(dir, 'site.json'), JSON.stringify(s2));
  build();
  assert.ok(read('index.html').includes('테스트 브랜드') && read('assets/theme.css').includes('#123456'));
  assert.ok(read('shop/track.html').includes('<title data-tpl="배송 조회 | {brand}">배송 조회 | 테스트 브랜드</title>'));
  writeFileSync(join(dir, 'site.json'), JSON.stringify(site)); build();
});

test('scripts/new-post.mjs · new-product.mjs 가 추가 후 빌드까지 한다', () => {
  const body = join(dir, 'draft.md'); writeFileSync(body, '첫 문단입니다.\n\n## 소제목\n\n- 하나\n- 둘');
  execFileSync(process.execPath, [join(dir, 'scripts/new-post.mjs'), '--title', '테스트 글', '--slug', 'test-post', '--body-file', body, '--tags', '테스트,자동', '--author', '봇'], { encoding: 'utf8' });
  assert.ok(existsSync(join(dir, 'blog/test-post.html')));
  assert.ok(read('blog/test-post.html').includes('<h2>소제목</h2>'));
  assert.ok(read('index.html').includes('data-post-card="test-post"'), '새 글이 홈 최신 글에 없음');
  assert.ok(read('sitemap.xml').includes('blog/test-post.html'));
  assert.throws(() => execFileSync(process.execPath, [join(dir, 'scripts/new-post.mjs'), '--title', 'x', '--slug', 'test-post', '--body', 'y'], { stdio: 'pipe' }), '중복 슬러그를 막지 않음');

  execFileSync(process.execPath, [join(dir, 'scripts/new-product.mjs'), '--id', 'test-item', '--name', '테스트 상품', '--price', '9900', '--category', 'blend', '--stock', '3', '--featured'], { encoding: 'utf8' });
  const html = read('shop/products/test-item.html');
  assert.ok(html.includes('<title>테스트 상품 | ') && html.includes('9,900원'));
  assert.ok(existsSync(join(dir, 'assets/img/p-test-item.svg')), '플레이스홀더 이미지가 안 만들어짐');
  assert.ok(read('shop/index.html').includes('data-product-card="test-item"'));
  assert.ok(read('llms.txt').includes('테스트 상품'));
  // 상품을 지우면 상세 페이지도 정리
  const data = JSON.parse(read('shop/products.json')); data.products = data.products.filter((p) => p.id !== 'test-item'); writeFileSync(join(dir, 'shop/products.json'), JSON.stringify(data)); build();
  assert.ok(!existsSync(join(dir, 'shop/products/test-item.html')));
});
