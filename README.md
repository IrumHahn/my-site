# my-site — 블로그 + 쇼핑몰 정적 사이트 템플릿

**내 브랜드 홈페이지 + 간이 블로그 + 모의 결제까지 되는 쇼핑몰**을 파일 몇 개로 띄우는 수강생용 템플릿입니다.

- 순수 HTML/CSS/JS. 서버·DB·프레임워크·npm 패키지 없음. 필요한 건 **Node 18+** 하나 (`node build.mjs`).
- 글·상품 카드는 **HTML에 직접 구워** 둡니다 → 검색엔진·AI 크롤러가 빈 화면을 보지 않습니다.
- 결제는 **모의 결제창**, 주문·재고·문의는 **브라우저(localStorage) 안**에서만 동작하는 데모입니다. 실결제·실서버 없음.
- 네이버 블로그가 없는 분을 위한 "간이 블로그"로도 그대로 쓸 수 있습니다 (스토어 메뉴를 빼면 됩니다).

```
my-site/
  site.json              ← 브랜드명·영문명·한줄소개·색 2개·로고 이모지·연락처·SNS·baseUrl  (여기만 고쳐도 사이트가 바뀜)
  index.html             홈: 히어로 + 최신 글 3 + 대표 상품 3 + 소개 + FAQ + 연락
  blog/                  posts.json(글 데이터) · index.html(목록) · <slug>.html(빌드 산출) · post.html(미리보기용) · feed.xml
  shop/                  products.json(상품 데이터) · index.html(전체 상품) · products/<id>.html · details/<id>.html(상세 오버라이드)
                         checkout.html(주문서+모의결제) · order-complete.html · track.html · support.html · shop.js · data.js
  admin/index.html       관리자: 글 · 상품/재고 · 주문/배송 · 문의 · 운영 브리핑 · (선택) GitHub 토큰 연결
  assets/                site.css(공용) · theme.css(빌드 산출, site.json 색) · img/(플레이스홀더 SVG — 실제 이미지로 교체)
  build.mjs              모든 산출물을 만드는 빌드 스크립트
  scripts/               new-post.mjs · new-product.mjs  (에이전트/터미널용 CLI)
  tests/build.test.mjs   node --test
  deploy/                cloudflare-pages.md · wrangler.toml · vercel.json
```

---

## A 트랙 — 초급: 코드 안 보고 운영하기

### 1. 처음 한 번: 내 브랜드로 바꾸기

1. `site.json` 을 열어 아래 값을 내 것으로 바꿉니다. (따옴표·쉼표만 지키면 됩니다)
   - `brand`, `en`, `tagline`, `description`, `logoEmoji`
   - `colors.primary`(글자·버튼 색), `colors.accent`(포인트 색), `colors.background`(바탕색)
   - `contact`, `sns`(없는 건 `""`), `about`(소개 문단과 3가지 약속)
   - `shop.freeShipping`(무료배송 기준), `shop.shippingFee`
   - `baseUrl` 은 배포 후 받은 주소로 (끝에 `/`)
2. 터미널에서 `node build.mjs` → 모든 페이지의 헤더·푸터·색·제목이 바뀝니다.
3. `npx serve .` 로 열어 확인합니다 (<http://localhost:3000>). 파일을 더블클릭해 여는 방식(file://)은 블로그 미리보기·관리자가 동작하지 않으니 꼭 서버로 여세요.

### 2. 배포하기 (Cloudflare Pages, 무료)

`deploy/cloudflare-pages.md` 의 A 절을 따라 하세요. 요약: GitHub 에 올리기 → Cloudflare Pages 에서 저장소 연결 → Build command `node build.mjs`, Output `/`, 환경변수 `NODE_VERSION=20`. 이후엔 **커밋만 하면 자동 배포**됩니다.

### 3. 글 쓰기 (세 가지 방법 중 하나)

**방법 ① 관리자 페이지 (로컬 모드)** — `/admin/` → 글 관리 → 새 글 쓰기 → 저장 → **posts.json 내려받기** → 받은 파일을 `blog/posts.json` 에 덮어쓰기 → `node build.mjs` → 커밋.

**방법 ② 관리자 페이지 (GitHub 모드, 선택)** — `/admin/` → GitHub 연결 탭에서 토큰·저장소 입력. 이후 글을 저장하면 저장소의 `blog/posts.json` 이 바로 커밋되고 Cloudflare 가 1~2분 안에 재배포합니다. 토큰은 내 브라우저에만 평문 저장되니 **본인 기기에서만** 쓰세요.

**방법 ③ 에이전트(Claude Code 등)에게 시키기** — 아래 문장을 그대로 붙여넣으세요.

> `scripts/new-post.mjs` 로 "○○○" 주제의 글을 써서 올려줘. 본문은 빈 줄=문단, `## `=소제목, `- `=목록 규칙만 써. FAQ 2개와 출처 1개를 넣고, 빌드까지 한 뒤 `blog/<slug>.html` 을 열어 제목·설명·JSON-LD 가 들어갔는지 확인하고 커밋해줘.

본문 규칙은 이 네 가지뿐입니다: 빈 줄 = 문단 / `## ` = 소제목 / `- ` = 목록 / `![설명](../assets/img/파일.jpg)` = 이미지.

### 4. 상품 올리기·고치기

- 가격·재고·배지·대표 여부: `/admin/` → 상품·재고 탭 → 고치고 **products.json 내려받기** → `shop/products.json` 덮어쓰기 → `node build.mjs`. ("이 브라우저에 저장"은 내 브라우저에서만 보이는 임시 반영입니다.)
- 새 상품·스토리·특징·옵션: `shop/products.json` 을 직접 편집하거나 에이전트에게 `scripts/new-product.mjs` 를 시킵니다.
- 상품 이미지: `assets/img/` 에 넣고 `products.json` 의 `image` 를 그 경로로. 이미지가 없으면 빌드가 플레이스홀더 SVG 를 만들어 줍니다.
- **상세페이지를 통째로 꾸미고 싶으면** `shop/details/<상품id>.html` 에 HTML 조각을 쓰세요 (예시: `shop/details/dawn-blend.html`). 빌드가 상세 페이지 구매 영역 아래에 끼워 넣습니다.

### 5. 주문이 들어오면

데모라서 주문은 **주문한 사람의 브라우저**에만 저장됩니다. 수업에서는 같은 브라우저로 `/shop/` 에서 주문 → `/admin/` 주문 탭에서 상태 변경 → `/shop/track.html` 에서 확인하는 흐름을 체험합니다. 실주문을 받으려면 B 트랙의 "실서비스로 갈 때" 를 보세요.

---

## B 트랙 — 상급: 구조 이해하고 확장하기

### 데이터 흐름

```
site.json ─┐
blog/posts.json ─┤── node build.mjs ──▶ assets/theme.css (색 → CSS 변수)
shop/products.json ─┘                    index.html 의 HERO/POSTS/FEATURED/ABOUT/FAQ/CONTACT/JSONLD 블록
                                         모든 페이지의 HEADER/FOOTER 블록 · <title data-tpl> · <meta data-tpl>
                                         blog/<slug>.html (글마다 title/description/canonical/OG + BlogPosting/FAQPage/Breadcrumb)
                                         blog/index.html 의 POSTS 블록 · blog/feed.xml
                                         shop/index.html · shop/products/<id>.html (Product + Breadcrumb JSON-LD, 옵션, 상세 오버라이드)
                                         shop/data.js (브라우저용 사본: brand + products)
                                         sitemap.xml · robots.txt · llms.txt
shop/shop.js : 장바구니 · 주문 · 재고 차감 · 문의 (localStorage)  → 모든 페이지가 로드
admin/       : 같은 localStorage 를 읽고 씀 + posts/products JSON 편집(+GitHub Contents API)
```

- 템플릿 페이지(`index.html`, `blog/index.html`, `blog/post.html`, `shop/checkout.html` 등)는 **마커 사이만** 빌드가 다시 씁니다. 마커 바깥은 자유롭게 고쳐도 됩니다. 빌드는 몇 번을 돌려도 같은 결과(멱등)입니다.
- `<html data-root="…shop/" data-site="…">` 는 빌드가 페이지 깊이에 맞춰 넣습니다. `shop.js` 가 이걸로 링크·이미지 경로를 만듭니다.
- 생성 전용 파일(`shop/products/*.html`, `blog/<slug>.html`, `data.js`, `theme.css`, `sitemap.xml`, `llms.txt`, `robots.txt`, `feed.xml`)은 직접 고치지 마세요. 다음 빌드에 덮어써집니다.

### 데이터 스키마

**site.json** — `brand, en, tagline, description, logoEmoji, colors{primary,accent,background}, contact{email,phone,hours,address}, sns{instagram,youtube,naverBlog,kakao,…}, baseUrl, about{title,body,points[{title,desc}]}, shop{freeShipping,shippingFee,orderPrefix,currencyNote}`

**blog/posts.json** — 배열. 필수 `id, slug, title, date(YYYY-MM-DD), body`. 선택 `summary, tags[], author, updated, description, faq[{q,a}], sources[{title,url}]`. `slug` 가 파일명(`blog/<slug>.html`)이 됩니다.

**shop/products.json** — `categories[{id,name}]`, `options{<groupId>:{name, items[{id,name,add}]}}`, `products[]`, `faq[{q,a}]`.
상품 필수 `id(영문 소문자·숫자·하이픈), name, price, category`. 선택 `sub, unit('/회' 등), image, tags[], specs[{k,v}], stock, badge, featured, options[groupId…], freeShipping(true 면 배송비 면제), stockNote, story, tip, detail(HTML 문자열; `shop/details/<id>.html` 이 있으면 그쪽 우선)`.

### CLI

```bash
node scripts/new-post.mjs --title "제목" --slug my-post --body-file draft.md --tags "a,b" --author "이름" \
     --faq "질문 | 답" --source "제목 | https://…"      # posts.json 추가 + 빌드.  --update 로 덮어쓰기, --no-build 로 빌드 생략
node scripts/new-post.mjs --json post.json              # JSON 한 덩어리로 (stdin: --json -)
node scripts/new-product.mjs --id my-item --name "상품" --price 12000 --category blend --stock 20 \
     --tags "특징1,특징2" --spec "소재 | 면 100%" --options size --featured --detail-file detail.html
node --test tests/build.test.mjs                        # 빌드 산출물·카드·sitemap/llms·CLI 검증 (임시 폴더에서 실행)
```

### 디자인 바꾸기

- 색: `site.json` 의 `colors` → `assets/theme.css` 로 생성. 파생색(`--ink-2`, `--paper-2`, `--line`)은 `assets/site.css` 상단에서 `color-mix()` 로 계산합니다.
- 서체: `assets/site.css` 의 `--serif`, `--sans`. 폰트 `<link>` 는 각 페이지 head 와 `build.mjs` 의 `head()` 두 곳에 있습니다.
- 레이아웃·섹션: `index.html` 의 마커 바깥, 또는 `build.mjs` 의 `card()`, `postCard()`, `header()`, `footer()`.
- 메뉴: `build.mjs` 의 `NAV` 배열. 스토어를 뺀 블로그 전용 사이트로 쓰려면 `NAV` 에서 shop 항목을 지우고 `index.html` 의 FEATURED 섹션을 지우면 됩니다 (빌드는 그대로 동작).

### 실서비스로 갈 때 바꾸는 곳

| 기능 | 지금(데모) | 바꾸는 곳 |
|---|---|---|
| 결제 | `shop/checkout.html` 모의 결제창 | 토스페이먼츠/포트원 결제위젯 + 승인 API 1개 |
| 주문 저장 | `shop.js` `placeOrder()` → localStorage | Google Apps Script(시트) 또는 Cloudflare Worker/Function |
| 재고 | `shop.js` `stockOf()/setStock()` | 시트 컬럼 하나. 주문 시 차감, 관리자에서 수정 |
| 알림 | 관리자 상태 변경 시 문구 생성만 | 알림톡/문자 API |
| 상담봇 | `shop/support.html` `answer()` 규칙 기반 | 같은 자료(products.json·FAQ·주문)를 Claude/GPT API 에 넘기기 |
| 글 발행 | posts.json 커밋 → Pages 빌드 | 그대로 충분. 예약 발행은 GitHub Actions cron 으로 `scripts/new-post.mjs` 실행 |

### SEO / AEO 체크리스트 (빌드가 자동으로 해 주는 것)

- 페이지마다 고유 `<title>`, `description`, `canonical`, OG. 글은 `og:type=article`, `author`.
- JSON-LD: 홈 Organization/WebSite/OnlineStore · 글 BlogPosting+FAQPage+BreadcrumbList · 상품 Product+BreadcrumbList · 목록 ItemList · 고객센터 FAQPage.
- `sitemap.xml`, `robots.txt`(admin·checkout 제외), `llms.txt`(상품·글·FAQ 요약), `blog/feed.xml`.
- 카드·본문은 HTML 에 구워져 있어 JS 를 실행하지 않는 크롤러도 읽습니다. `blog/post.html?slug=` 는 미리보기 전용(noindex).

### 출처

- 블로그: `ec-brand-site/class/kit/blog/` (posts.json 스키마, post.html 의 메타·JSON-LD·FAQ·출처 렌더링, admin.html 의 GitHub 토큰 모드)를 이식하고, 정적 페이지 생성·RSS·slug 를 추가.
- 쇼핑몰: `AI-Shopping-mall/sample-roastery/` (build.mjs, shop.js, checkout/order-complete/track/support, admin)을 이식하고, 브랜드를 site.json 으로 분리, 옵션 그룹 일반화(`options{}`), 상세 오버라이드(`shop/details/`), 플레이스홀더 이미지 생성을 추가. `button[data-add]` 로 한정한 장바구니 클릭 핸들러(옵션 라디오와의 충돌 수정)는 그대로 유지.
