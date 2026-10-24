// my-site 정적 빌드 스크립트 (sample-roastery/build.mjs 를 확장)
// site.json + blog/posts.json + shop/products.json →
//   assets/theme.css, index.html 블록, blog/<slug>.html, blog/index.html 목록, blog/feed.xml,
//   shop/products/*.html, shop/index.html, shop/data.js, sitemap.xml, robots.txt, llms.txt
// 실행:  node build.mjs      (npm 패키지 없이 node 만 있으면 됩니다)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const write = (p, s) => { mkdirSync(dirname(join(here, p)), { recursive: true }); writeFileSync(join(here, p), s); };

const S = JSON.parse(read('site.json'));
const P = JSON.parse(read('shop/products.json'));
const POSTS = JSON.parse(read('blog/posts.json')).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
const BASE = String(S.baseUrl || '/').replace(/\/?$/, '/');
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = (n) => Number(n).toLocaleString('ko-KR') + '원';
const catName = (id) => (P.categories.find((c) => c.id === id) || {}).name || '';
const slugOf = (post) => post.slug || post.id;
const postHref = (post, site = '') => `${site}blog/${slugOf(post)}.html`;
const fmtDate = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };

/* ---------- 0. 색 → CSS 변수 ---------- */
write('assets/theme.css', `/* build.mjs 가 site.json 의 colors 에서 생성. 직접 고치지 말고 site.json 을 고친 뒤 node build.mjs */
:root { --ink: ${S.colors.primary}; --amber: ${S.colors.accent}; --paper: ${S.colors.background || '#f6f1e8'}; }
`);

/* ---------- 공통 조각 ---------- */
const favicon = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='${encodeURIComponent(S.colors.primary)}'/><text y='.72em' x='50' text-anchor='middle' font-size='56'>${encodeURIComponent(S.logoEmoji || '★')}</text></svg>`;
const OG_IMAGE = `${BASE}assets/img/og.svg`;

const head = ({ title, desc, path, jsonld = [], site = '', noindex = false, extra = '' }) => `<!doctype html>
<html lang="ko" data-root="${site}shop/" data-site="${site}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${BASE}${path}">`}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE}${path}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="theme-color" content="${S.colors.primary}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<link rel="stylesheet" href="${site}assets/theme.css">
<link rel="stylesheet" href="${site}assets/site.css">
${extra}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>`;

const logo = (site) => `<a class="logo" href="${site}index.html"><span class="emoji" aria-hidden="true">${esc(S.logoEmoji || '')}</span><span>${esc(S.brand)}<small>${esc(S.en || '')}</small></span></a>`;
const NAV = [['index.html', 'home', '홈'], ['blog/', 'blog', '블로그'], ['shop/', 'shop', '스토어'], ['shop/support.html', 'support', '고객센터'], ['shop/track.html', 'track', '배송 조회']];
const header = (site, current) => `<!-- HEADER:START (build.mjs 가 site.json 으로 다시 씁니다) -->
<header class="site-header"><div class="wrap">
  ${logo(site)}
  <nav class="nav" aria-label="주요 메뉴">
    ${NAV.map(([href, key, label]) => `<a href="${site}${href}"${current === key ? ' class="is-current" aria-current="page"' : ''}>${label}</a>`).join('\n    ')}
  </nav>
  <div class="nav-tools">
    <button type="button" class="cart-btn" data-cart-open aria-label="장바구니 열기"><span class="t">장바구니</span> <b data-cart-count hidden>0</b></button>
    <button type="button" class="menu-btn" aria-label="메뉴"><span></span><span></span><span></span></button>
  </div>
</div></header>
<!-- HEADER:END -->`;

const snsLinks = Object.entries(S.sns || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${{ instagram: '인스타그램', youtube: '유튜브', naverBlog: '네이버 블로그', kakao: '카카오톡 채널', x: 'X', threads: '스레드' }[k] || k}</a>`);
const footer = (site) => `<!-- FOOTER:START (build.mjs 가 site.json 으로 다시 씁니다) -->
<footer class="site-footer"><div class="wrap">
  <div><div class="logo">${esc(S.logoEmoji || '')} ${esc(S.brand)}<small>${esc(S.en || '')}</small></div><p style="margin-top:12px">${esc(S.tagline)}</p><p>${esc(S.contact.email)} · ${esc(S.contact.phone)}${S.contact.hours ? ' · ' + esc(S.contact.hours) : ''}</p>${snsLinks.length ? `<div class="sns">${snsLinks.join('')}</div>` : ''}</div>
  <div><h4>SHOP</h4><a href="${site}shop/">전체 상품</a><a href="${site}shop/track.html">배송 조회</a><a href="${site}shop/support.html">고객센터 · FAQ</a></div>
  <div><h4>STORY</h4><a href="${site}blog/">블로그</a><a href="${site}index.html#about">소개</a><a href="${site}index.html#contact">연락처</a><a href="${site}admin/" rel="nofollow">관리자</a></div>
  <div class="copy"><span>© ${new Date().getFullYear()} ${esc(S.en || S.brand)}</span><span>결제·주문·재고는 브라우저 안에서만 동작하는 데모입니다</span></div>
</div></footer>
<script src="${site}shop/data.js"></script>
<script src="${site}shop/shop.js"></script>
<!-- FOOTER:END -->`;

/* ---------- 정적 템플릿 페이지에 헤더·푸터·메타 끼워 넣기 ----------
   페이지 안의 마커/속성만 바꾸므로 여러 번 돌려도 같은 결과가 나옵니다. */
const TPL = { brand: S.brand, en: S.en || '', tagline: S.tagline, base: BASE, email: S.contact.email, phone: S.contact.phone, og: OG_IMAGE, description: S.description };
const tpl = (s) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in TPL ? TPL[k] : `{${k}}`));
function applyTemplate(file, { site, current }) {
  if (!existsSync(join(here, file))) return;
  let html = read(file);
  html = html.replace(/<html lang="ko"[^>]*>/, `<html lang="ko" data-root="${site}shop/" data-site="${site}">`);
  html = html.replace(/<!-- HEADER:START[\s\S]*?<!-- HEADER:END -->/, header(site, current));
  html = html.replace(/<!-- FOOTER:START[\s\S]*?<!-- FOOTER:END -->/, footer(site));
  html = html.replace(/<title data-tpl="([^"]*)">[^<]*<\/title>/g, (_, t) => `<title data-tpl="${t}">${esc(tpl(t))}</title>`);
  html = html.replace(/<(meta|link)([^>]*?)data-tpl="([^"]*)"([^>]*)>/g, (m, tag, pre, t, post) => {
    const attr = tag === 'link' ? 'href' : 'content';
    const re = new RegExp(`\\s${attr}="[^"]*"`);
    const rest = (pre + post).replace(re, '').replace(/\s+/g, ' ').replace(/\s+$/, '');
    return `<${tag}${rest} data-tpl="${t}" ${attr}="${esc(tpl(t))}">`;
  });
  write(file, html);
}

/* ---------- 1. 쇼핑몰 ---------- */
// 이미지가 없으면 플레이스홀더 SVG 를 만들어 둡니다 (수강생이 나중에 jpg 로 바꾸면 됩니다)
function placeholder(path, label, idx = 0) {
  if (existsSync(join(here, path))) return;
  if (!/\.svg$/i.test(path)) return;
  const hues = [S.colors.accent, S.colors.primary];
  const bg = hues[idx % 2], fg = idx % 2 ? S.colors.background || '#fff' : '#fff';
  write(path, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect width="800" height="1000" fill="${bg}"/><circle cx="400" cy="420" r="190" fill="${fg}" opacity=".18"/><text x="400" y="440" text-anchor="middle" font-size="120">${esc(S.logoEmoji || '★')}</text><text x="400" y="720" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="700" fill="${fg}">${esc(label)}</text><text x="400" y="780" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${fg}" opacity=".7">이미지를 교체해 주세요</text></svg>`);
}
P.products.forEach((p, i) => placeholder(p.image, p.name, i));
if (!existsSync(join(here, 'assets/img/og.svg'))) write('assets/img/og.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect width="1200" height="630" fill="${S.colors.primary}"/><text x="600" y="290" text-anchor="middle" font-size="140">${esc(S.logoEmoji || '')}</text><text x="600" y="420" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="700" fill="#fff">${esc(S.brand)}</text><text x="600" y="490" text-anchor="middle" font-family="sans-serif" font-size="30" fill="${S.colors.accent}">${esc(S.tagline)}</text></svg>`);

const brand = { name: S.brand, en: S.en, tagline: S.tagline, url: BASE, email: S.contact.email, phone: S.contact.phone, freeShipping: S.shop.freeShipping, shippingFee: S.shop.shippingFee, orderPrefix: S.shop.orderPrefix || 'OD' };
write('shop/data.js', `// build.mjs 가 site.json + shop/products.json 에서 생성. 직접 고치지 말고 원본을 고친 뒤 node build.mjs\nwindow.SITE_DATA = ${JSON.stringify({ brand, ...P })};\n`);

const stockNote = (p) => `<span class="stock-note" data-stock-for="${p.id}"></span>`;
const badge = (p) => {
  if (p.stock <= 0) return '<span class="badge soldout">SOLD OUT</span>';
  if (p.stock <= 5) return '<span class="badge low">소량 남음</span>';
  return p.badge ? `<span class="badge">${esc(p.badge)}</span>` : '';
};
const hasOpts = (p) => Array.isArray(p.options) && p.options.length > 0;
export const card = (p, site = '') => `<article class="card reveal${p.stock <= 0 ? ' is-soldout' : ''}" data-cat="${p.category}" data-product-card="${p.id}">
  ${badge(p)}
  <a class="card-media" href="${site}shop/products/${p.id}.html"><img src="${site}${p.image}" alt="${esc(p.name)}" loading="lazy" width="800" height="1000"></a>
  <div class="card-body">
    <span class="card-cat">${esc(catName(p.category))}</span>
    <h3><a href="${site}shop/products/${p.id}.html">${esc(p.name)}</a></h3>
    <p class="card-sub">${esc(p.sub || '')}</p>
    <div class="card-notes">${(p.tags || []).slice(0, 3).map((n) => `<span>${esc(n)}</span>`).join('')}</div>
    <div class="card-foot"><span class="price">${won(p.price)}${p.unit ? `<small>${esc(p.unit)}</small>` : ''}</span>${stockNote(p)}</div>
    ${hasOpts(p)
      ? `<a class="btn sm ghost block" href="${site}shop/products/${p.id}.html" style="margin-top:12px">옵션 고르기</a>`
      : `<button type="button" class="btn sm block" data-add="${p.id}" style="margin-top:12px">${p.stock <= 0 ? '품절' : '장바구니 담기'}</button>`}
  </div>
</article>`;

const productLD = (p) => ({
  '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: BASE + p.image, description: p.story || p.sub,
  brand: { '@type': 'Brand', name: S.brand }, category: catName(p.category), url: `${BASE}shop/products/${p.id}.html`,
  offers: { '@type': 'Offer', priceCurrency: 'KRW', price: p.price, url: `${BASE}shop/products/${p.id}.html`, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' }
});

// shop/index.html — 전체 상품 (카드를 HTML 에 직접 구움)
const listLD = { '@context': 'https://schema.org', '@type': 'ItemList', name: `${S.brand} 상품`, url: `${BASE}shop/`, numberOfItems: P.products.length,
  itemListElement: P.products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}shop/products/${p.id}.html`, name: p.name })) };
write('shop/index.html', `${head({ title: `전체 상품 | ${S.brand}`, desc: `${S.brand}의 전체 상품 ${P.products.length}종. 가격·재고를 확인하고 바로 주문하세요. ${S.shop.currencyNote || ''}`.trim(), path: 'shop/', jsonld: [listLD], site: '../' })}
<body>
${header('../', 'shop')}
<main class="wrap section" style="padding-top:48px">
  <p class="eyebrow">ALL PRODUCTS</p>
  <h1 class="section-title">전체 상품</h1>
  <p class="section-lead">${esc(S.tagline)}. ${won(S.shop.freeShipping)} 이상 무료배송.</p>
  <div class="filters" role="tablist">
    <button type="button" class="is-active" data-filter="all">전체</button>
    ${P.categories.map((c) => `<button type="button" data-filter="${c.id}">${esc(c.name)}</button>`).join('')}
  </div>
  <div class="grid" id="catalog">
    ${P.products.map((p) => card(p, '../')).join('\n')}
  </div>
</main>
${footer('../')}
<script>
document.querySelectorAll('[data-filter]').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('[data-filter]').forEach(function(x){x.classList.toggle('is-active',x===b)});
  var f=b.dataset.filter;document.querySelectorAll('#catalog .card').forEach(function(c){c.hidden=f!=='all'&&c.dataset.cat!==f;});
});});
</script>
</body></html>`);

// shop/products/<id>.html — 상세. shop/details/<id>.html 이나 products.json 의 detail 필드가 있으면 상세 설명 영역에 끼워 넣습니다.
const detailOf = (p) => {
  const f = join(here, 'shop/details', `${p.id}.html`);
  if (existsSync(f)) return readFileSync(f, 'utf8');
  return p.detail || '';
};
// 지워진 상품의 상세 페이지 정리
for (const f of readdirSync(join(here, 'shop/products'))) { const id = f.replace(/\.html$/, ''); if (f.endsWith('.html') && !P.products.some((p) => p.id === id)) unlinkSync(join(here, 'shop/products', f)); }
for (const p of P.products) {
  const related = P.products.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 3);
  const rel = related.length ? related : P.products.filter((x) => x.id !== p.id).slice(0, 3);
  const opts = hasOpts(p) ? p.options.map((gid) => { const g = P.options[gid]; if (!g) return ''; return `
    <div class="opt"><label>${esc(g.name)}</label><div class="opt-row">${g.items.map((it, i) => `<label><input type="radio" name="opt-${gid}" value="${esc(it.id)}"${i === 0 ? ' checked' : ''} data-extra="${it.add || 0}"><span>${esc(it.name)}${it.add ? ` (+${won(it.add)})` : ''}</span></label>`).join('')}</div></div>`; }).join('') : '';
  const detail = detailOf(p);
  write(`shop/products/${p.id}.html`, `${head({ title: `${p.name} | ${S.brand}`, desc: `${p.sub || ''}. ${p.story || ''}`.replace(/^\. /, ''), path: `shop/products/${p.id}.html`, jsonld: [productLD(p), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: BASE }, { '@type': 'ListItem', position: 2, name: '스토어', item: BASE + 'shop/' }, { '@type': 'ListItem', position: 3, name: p.name }] }], site: '../../' })}
<body>
${header('../../', 'shop')}
<main class="wrap">
  <section class="pd" data-product="${p.id}">
    <div class="pd-media">${badge(p)}<img src="../../${p.image}" alt="${esc(p.name)}" width="800" height="1000"></div>
    <div>
      <p class="eyebrow">${esc(catName(p.category))}</p>
      <h1>${esc(p.name)}</h1>
      <p class="pd-sub">${esc(p.sub || '')}</p>
      <div class="price" id="price">${won(p.price)}${p.unit ? `<small>${esc(p.unit)}</small>` : ''}</div>
      <p class="pd-story">${esc(p.story || '')}</p>
      ${(p.specs && p.specs.length) || (p.tags && p.tags.length) ? `<dl class="spec">
        ${p.tags && p.tags.length ? `<dt>특징</dt><dd>${p.tags.map(esc).join(' · ')}</dd>` : ''}
        ${(p.specs || []).map((s) => `<dt>${esc(s.k)}</dt><dd>${esc(s.v)}</dd>`).join('\n        ')}
      </dl>` : ''}
      ${opts}
      <div class="pd-actions">
        <div class="qty"><button type="button" data-qty="-1" aria-label="수량 줄이기">−</button><output id="qty">1</output><button type="button" data-qty="1" aria-label="수량 늘리기">+</button></div>
        <button type="button" class="btn amber" id="addBtn">${p.stock <= 0 ? '품절 · 재입고 알림 신청' : '장바구니 담기'}</button>
      </div>
      <div class="pd-total"><span>합계 <span id="stockText" class="stock-note"></span></span><strong id="total">${won(p.price)}</strong></div>
      <div class="trust">${(S.about.points || []).slice(0, 3).map((pt) => `<div><b>${esc(pt.title)}</b>${esc(pt.desc)}</div>`).join('')}</div>
      ${p.tip ? `<div class="tip-box"><b>TIP</b>${esc(p.tip)}</div>` : ''}
    </div>
  </section>
  ${detail ? `<section class="pd-detail" id="detail">
<!-- DETAIL:START (shop/details/${p.id}.html 또는 products.json 의 detail 에서 가져옴) -->
${detail}
<!-- DETAIL:END -->
  </section>` : ''}
  <section class="section">
    <p class="eyebrow">YOU MAY ALSO LIKE</p>
    <h2 class="section-title" style="font-size:28px">함께 보면 좋은 상품</h2>
    <div class="grid" style="margin-top:28px">${rel.map((x) => card(x, '../../')).join('')}</div>
  </section>
</main>
${footer('../../')}
<script>
(function(){
  var id=${JSON.stringify(p.id)}, base=${p.price}, q=1, stock=SHOP.stockOf(id), groups=${JSON.stringify(p.options || [])};
  function opts(){ var o={}; groups.forEach(function(g){ var r=document.querySelector('input[name="opt-'+g+'"]:checked'); if(r) o[g]=r.value; }); return o; }
  function unit(){ var u=base; groups.forEach(function(g){ var r=document.querySelector('input[name="opt-'+g+'"]:checked'); if(r) u+=(+r.dataset.extra||0); }); return u; }
  function paint(){ document.getElementById('qty').textContent=q; document.getElementById('total').textContent=SHOP.won(unit()*q); document.getElementById('price').firstChild.nodeValue=SHOP.won(unit());
    var st=document.getElementById('stockText'); if(stock<=0){st.textContent='· 품절';st.className='stock-note out';} else if(stock<=5){st.textContent='· '+stock+'개 남음';st.className='stock-note';} else st.textContent=''; }
  document.querySelectorAll('.opt input[type=radio]').forEach(function(r){r.addEventListener('change',paint)});
  document.querySelectorAll('[data-qty]').forEach(function(b){b.addEventListener('click',function(){q=Math.max(1,Math.min(stock||1,q+(+b.dataset.qty)));paint();})});
  document.getElementById('addBtn').addEventListener('click',function(){
    if(stock<=0){ SHOP.addInquiry({type:'restock',product:id,name:'',contact:'',message:'재입고 알림 신청'}); SHOP.toast('재입고되면 알려드릴게요 (데모)'); return; }
    SHOP.add({id:id,q:q,opts:opts()});
  });
  paint();
})();
</script>
</body></html>`);
}

/* ---------- 2. 블로그 ---------- */
const mdLite = (src) => String(src || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => {
  b = b.trim(); if (!b) return '';
  const lines = b.split('\n');
  if (lines.every((l) => /^- /.test(l.trim()))) return `<ul>${lines.map((l) => `<li>${esc(l.trim().slice(2))}</li>`).join('')}</ul>`;
  if (/^## /.test(b)) return `<h2>${esc(b.slice(3).trim())}</h2>`;
  if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(b)) { const m = b.match(/^!\[([^\]]*)\]\(([^)]+)\)$/); return `<img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">`; }
  return `<p>${esc(b).replace(/\n/g, '<br>')}</p>`;
}).join('\n');

const postCard = (post, site = '') => `<a class="post-card reveal" href="${postHref(post, site)}" data-post-card="${esc(slugOf(post))}">
  <time datetime="${esc(post.date)}">${fmtDate(post.date)}</time>
  <h3>${esc(post.title)}</h3>
  <p>${esc(post.summary || '')}</p>
  ${post.tags && post.tags.length ? `<div class="tags">${post.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
</a>`;

// 지워진 글의 정적 페이지 정리 (index.html, post.html 은 유지)
for (const f of readdirSync(join(here, 'blog'))) { const slug = f.replace(/\.html$/, ''); if (f.endsWith('.html') && !['index', 'post'].includes(slug) && !POSTS.some((p) => slugOf(p) === slug)) unlinkSync(join(here, 'blog', f)); }
POSTS.forEach((post, idx) => {
  const url = `${BASE}blog/${slugOf(post)}.html`;
  const desc = String(post.description || post.summary || '').slice(0, 160);
  const faq = (post.faq || []).filter((f) => f && f.q && f.a);
  const ld = [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: desc, datePublished: post.date, dateModified: post.updated || post.date, mainEntityOfPage: url, keywords: (post.tags || []).join(', '),
    ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}), publisher: { '@type': 'Organization', name: S.brand, url: BASE } }];
  if (faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: BASE }, { '@type': 'ListItem', position: 2, name: '블로그', item: BASE + 'blog/' }, { '@type': 'ListItem', position: 3, name: post.title, item: url }] });
  const prev = POSTS[idx + 1], next = POSTS[idx - 1];
  write(`blog/${slugOf(post)}.html`, `${head({ title: `${post.title} | ${S.brand}`, desc, path: `blog/${slugOf(post)}.html`, jsonld: ld, site: '../', extra: `<meta property="og:type" content="article">${post.author ? `\n<meta name="author" content="${esc(post.author)}">` : ''}` })}
<body>
${header('../', 'blog')}
<main class="article">
  <a class="back" href="index.html">&larr; 목록으로</a>
  <article>
    <header class="post-head">
      <time datetime="${esc(post.date)}">${fmtDate(post.date)}</time>
      <h1>${esc(post.title)}</h1>
      ${post.author || (post.updated && post.updated !== post.date) ? `<div class="meta">${post.author ? `<span>${esc(post.author)}</span>` : ''}${post.updated && post.updated !== post.date ? `<span>수정 ${fmtDate(post.updated)}</span>` : ''}</div>` : ''}
      ${post.tags && post.tags.length ? `<div class="tags">${post.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </header>
    <hr class="rule">
    <div class="body">
${mdLite(post.body)}
    </div>
    ${faq.length ? `<section class="faq"><h2>자주 묻는 질문</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : ''}
    ${post.sources && post.sources.length ? `<section class="sources"><h2>참고·출처</h2><ol>${post.sources.map((s) => s && s.url ? `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title || s.url)}</a></li>` : `<li>${esc((s && s.title) || s)}</li>`).join('')}</ol></section>` : ''}
    <div class="cta"><div><b>${esc(S.brand)}</b><br><span style="font-size:14px;color:var(--ink-2)">${esc(S.tagline)}</span></div><a class="btn sm" href="../shop/">스토어 보기 →</a></div>
    ${prev || next ? `<nav class="pn">${prev ? `<a class="prev" href="${slugOf(prev)}.html"><div class="dir">이전 글</div><div class="pn-title">${esc(prev.title)}</div></a>` : '<span></span>'}${next ? `<a class="next" href="${slugOf(next)}.html"><div class="dir">다음 글</div><div class="pn-title">${esc(next.title)}</div></a>` : ''}</nav>` : ''}
  </article>
</main>
${footer('../')}
</body></html>`);
});

// blog/index.html 의 목록 블록 + 템플릿 적용
applyTemplate('blog/index.html', { site: '../', current: 'blog' });
{
  const list = POSTS.map((p) => `<li><a href="${slugOf(p)}.html" data-post-card="${esc(slugOf(p))}"><time datetime="${esc(p.date)}">${fmtDate(p.date)}</time><h2>${esc(p.title)}</h2><p class="summary">${esc(p.summary || '')}</p>${p.tags && p.tags.length ? `<div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}</a></li>`).join('\n');
  const html = read('blog/index.html').replace(/<!-- POSTS:START -->[\s\S]*?<!-- POSTS:END -->/, `<!-- POSTS:START -->\n${list || '<li class="empty">아직 올라온 글이 없습니다.</li>'}\n<!-- POSTS:END -->`);
  write('blog/index.html', html);
}
applyTemplate('blog/post.html', { site: '../', current: 'blog' });

// feed.xml (RSS 2.0)
write('blog/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(S.brand)} 블로그</title><link>${BASE}blog/</link><description>${esc(S.description || S.tagline)}</description><language>ko</language>
${POSTS.map((p) => `<item><title>${esc(p.title)}</title><link>${BASE}blog/${slugOf(p)}.html</link><guid>${BASE}blog/${slugOf(p)}.html</guid><pubDate>${new Date(p.date + 'T09:00:00+09:00').toUTCString()}</pubDate><description>${esc(p.summary || '')}</description>${(p.tags || []).map((t) => `<category>${esc(t)}</category>`).join('')}</item>`).join('\n')}
</channel></rss>
`);

/* ---------- 3. 쇼핑몰 정적 페이지 템플릿 적용 ---------- */
applyTemplate('shop/checkout.html', { site: '../', current: 'shop' });
applyTemplate('shop/order-complete.html', { site: '../', current: 'shop' });
applyTemplate('shop/track.html', { site: '../', current: 'track' });
applyTemplate('shop/support.html', { site: '../', current: 'support' });
applyTemplate('admin/index.html', { site: '../', current: '' });

/* ---------- 4. 홈 index.html ---------- */
applyTemplate('index.html', { site: '', current: 'home' });
{
  let html = read('index.html');
  const rep = (name, body) => { html = html.replace(new RegExp(`<!-- ${name}:START -->[\\s\\S]*?<!-- ${name}:END -->`), `<!-- ${name}:START -->\n${body}\n<!-- ${name}:END -->`); };
  rep('HERO', `<div class="emoji-big" aria-hidden="true">${esc(S.logoEmoji || '')}</div>
<p class="kicker">${esc(S.en || S.brand)}</p>
<h1>${esc(S.tagline)}</h1>
<p>${esc(S.description || '')}</p>
<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="shop/">상품 보러 가기</a><a class="btn ghost" href="blog/">블로그 읽기</a></div>`);
  rep('POSTS', POSTS.slice(0, 3).map((p) => postCard(p, '')).join('\n'));
  rep('FEATURED', P.products.filter((p) => p.featured).slice(0, 3).map((p) => card(p, '')).join('\n'));
  rep('ABOUT', `<div class="reveal">
  <p class="eyebrow">ABOUT</p>
  <h2 class="section-title">${esc(S.about.title)}</h2>
  <p>${esc(S.about.body)}</p>
</div>
<div class="steps" style="margin-top:0">
  ${(S.about.points || []).map((pt, i) => `<div class="reveal"><b>0${i + 1}</b><h3>${esc(pt.title)}</h3><p>${esc(pt.desc)}</p></div>`).join('\n  ')}
</div>`);
  rep('CONTACT', `<div class="contact-grid">
  <div><b>EMAIL</b><a href="mailto:${esc(S.contact.email)}">${esc(S.contact.email)}</a></div>
  <div><b>PHONE</b><a href="tel:${esc(S.contact.phone)}">${esc(S.contact.phone)}</a>${S.contact.hours ? `<br><span style="color:var(--ink-2);font-size:13px">${esc(S.contact.hours)}</span>` : ''}</div>
  ${S.contact.address ? `<div><b>ADDRESS</b>${esc(S.contact.address)}</div>` : ''}
</div>
${snsLinks.length ? `<div class="sns">${snsLinks.join('')}</div>` : ''}`);
  rep('FAQ', (P.faq || []).slice(0, 3).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n'));
  rep('JSONLD', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${BASE}#org`, name: S.brand, alternateName: S.en, url: BASE, email: S.contact.email, telephone: S.contact.phone, description: S.description, sameAs: Object.values(S.sns || {}).filter(Boolean) },
    { '@type': 'WebSite', '@id': `${BASE}#site`, url: BASE, name: S.brand, inLanguage: 'ko-KR', publisher: { '@id': `${BASE}#org` } },
    { '@type': 'OnlineStore', name: S.brand, url: `${BASE}shop/`, currenciesAccepted: 'KRW', paymentAccepted: '카드, 계좌이체, 간편결제' }
  ] })}</script>`);
  write('index.html', html);
}

/* ---------- 5. sitemap.xml · robots.txt · llms.txt ---------- */
const pages = ['', 'blog/', ...POSTS.map((p) => `blog/${slugOf(p)}.html`), 'shop/', ...P.products.map((p) => `shop/products/${p.id}.html`), 'shop/support.html', 'shop/track.html'];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `  <url><loc>${BASE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const basePath = new URL(BASE).pathname;
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: ${basePath}admin/\nDisallow: ${basePath}shop/checkout.html\nDisallow: ${basePath}shop/order-complete.html\nSitemap: ${BASE}sitemap.xml\n`);
write('llms.txt', `# ${S.brand}${S.en ? ` (${S.en})` : ''}

> ${S.tagline}. ${S.description || ''}

## 주요 페이지
- [홈](${BASE}): 브랜드 소개, 최신 글, 대표 상품
- [블로그](${BASE}blog/): 만드는 과정과 가이드 (RSS: ${BASE}blog/feed.xml)
- [전체 상품](${BASE}shop/): 가격과 재고
- [고객센터](${BASE}shop/support.html): FAQ, 1:1 문의
- [배송 조회](${BASE}shop/track.html): 주문번호로 배송 상태 확인

## 상품 (${TODAY} 기준)
${P.products.map((p) => `- ${p.name} — ${won(p.price)}${p.unit || ''} · ${p.sub || ''} · ${p.stock > 0 ? '판매 중' : '품절'} · ${BASE}shop/products/${p.id}.html`).join('\n')}

## 블로그 글
${POSTS.map((p) => `- [${p.title}](${BASE}blog/${slugOf(p)}.html) (${p.date}) — ${p.summary || ''}`).join('\n')}

## 배송·정책
- ${won(S.shop.freeShipping)} 이상 무료배송 (미만 ${won(S.shop.shippingFee)})
- 미개봉 7일 이내 교환, 파손·오배송은 즉시 재발송

## 자주 묻는 질문
${(P.faq || []).map((f) => `- Q. ${f.q}\n  A. ${f.a}`).join('\n')}

## 원본 데이터
- [상품 데이터(JSON)](${BASE}shop/products.json)
- [블로그 데이터(JSON)](${BASE}blog/posts.json)

## 연락처
- 이메일: ${S.contact.email}
- 전화: ${S.contact.phone}
`);

console.log(`빌드 완료: 상품 ${P.products.length}개 · 글 ${POSTS.length}편 → index.html, blog/*.html, blog/feed.xml, shop/index.html, shop/products/*.html, shop/data.js, sitemap.xml, robots.txt, llms.txt`);
