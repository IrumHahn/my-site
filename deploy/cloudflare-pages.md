# Cloudflare Pages 에 올리기

이 사이트는 정적 파일 + `node build.mjs` 하나로 끝납니다. 서버·DB·npm 패키지가 없습니다.

## A. 대시보드로 (초급 · 5분)

1. 이 폴더를 GitHub 저장소로 올립니다 (아래 "GitHub 에 올리기" 참고).
2. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 저장소 선택.
3. 빌드 설정을 이렇게 넣습니다.

   | 항목 | 값 |
   |---|---|
   | Framework preset | None |
   | Build command | `node build.mjs` |
   | Build output directory | `/` (루트, 빈칸이면 `.` ) |
   | Environment variables | `NODE_VERSION` = `20` |

4. **Save and Deploy**. 1~2분 뒤 `https://<프로젝트명>.pages.dev` 가 열립니다.
5. `site.json` 의 `baseUrl` 을 그 주소(끝에 `/` 포함)로 고치고 커밋 → 자동 재배포. (canonical·sitemap·OG 가 이 값을 씁니다)

이후에는 **커밋만 하면** Cloudflare 가 `node build.mjs` 를 돌려 다시 배포합니다. 관리자 페이지의 GitHub 모드로 글을 저장해도 같은 흐름입니다.

### Deploy 버튼 (README 에 붙이는 용)

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/<내아이디>/<저장소>)
```

버튼을 누른 사람의 계정에 저장소가 복제되고 Pages 프로젝트가 만들어집니다. 빌드 설정은 위 표와 같이 넣으라고 안내하세요.

## B. 터미널로 (상급 · wrangler)

```bash
npm i -g wrangler            # 한 번만
wrangler login
node build.mjs
wrangler pages deploy . --project-name my-site
```

`deploy/wrangler.toml` 을 프로젝트 루트로 복사하면 `wrangler pages deploy` 만으로 됩니다.
미리보기 브랜치: `wrangler pages deploy . --branch preview`.

## 커스텀 도메인

Pages 프로젝트 → **Custom domains** → 도메인 입력. Cloudflare 에 DNS 가 있으면 자동, 아니면 안내되는 CNAME 을 등록합니다. 연결 후 `site.json` 의 `baseUrl` 을 새 도메인으로 바꾸고 커밋하세요.

## GitHub 에 올리기 (처음 한 번)

```bash
cd my-site
git init && git add -A && git commit -m "첫 커밋"
gh repo create my-site --public --source=. --push     # gh CLI 가 없으면 github.com 에서 새 저장소 만들고 안내대로 push
```

## 대안: Vercel

`deploy/vercel.json` 을 루트에 복사하고 <https://vercel.com/new> 에서 저장소를 가져오면 됩니다 (Build Command `node build.mjs`, Output Directory `.`). 관리자 페이지 안내 문구는 Cloudflare 기준이지만 동작은 같습니다.

## 자주 막히는 곳

- **빌드 실패 `node: command not found`** → 환경변수 `NODE_VERSION=20` 추가.
- **이미지가 안 보임** → `products.json` 의 `image` 경로는 사이트 루트 기준(`assets/img/...`). 파일명 대소문자 확인.
- **글이 홈에 안 뜸** → `blog/posts.json` 수정 후 `node build.mjs` 를 안 돌렸거나, Pages 빌드 명령이 비어 있음.
- **관리자 GitHub 모드 404** → 저장소 이름 `owner/repo`, 브랜치 `main`, 경로 `blog/posts.json` 확인. 토큰 권한 Contents: Read and write.
