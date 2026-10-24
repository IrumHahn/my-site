#!/usr/bin/env node
// 새 글 추가 CLI (에이전트·사람 공용). blog/posts.json 에 글을 추가하고 node build.mjs 를 실행합니다.
//
//   node scripts/new-post.mjs --title "제목" --slug my-post --body-file draft.md --tags "태그1,태그2" \
//        [--summary "요약"] [--author "작성자"] [--date 2026-10-24] [--faq "질문 | 답" --faq "..."] \
//        [--source "제목 | URL"] [--update] [--no-build]
//   node scripts/new-post.mjs --json post.json      # posts.json 한 항목과 같은 형식의 JSON 파일
//   echo '{"title":...}' | node scripts/new-post.mjs --json -
//
// 본문 규칙: 빈 줄=문단, "## "=소제목, "- "=목록, "![alt](src)"=이미지 (blog/post.html 과 동일)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(root, 'blog', 'posts.json');

function parseArgs(argv) {
  const out = { _: [], faq: [], source: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const k = a.slice(2);
    if (k === 'update' || k === 'no-build' || k === 'help') { out[k] = true; continue; }
    const v = argv[++i];
    if (k === 'faq' || k === 'source') out[k].push(v); else out[k] = v;
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.title && !args.json)) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(args.help ? 0 : 1);
}

const today = new Date().toISOString().slice(0, 10);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post';
const pair = (line, k1, k2) => { const i = line.indexOf('|'); const o = {}; o[k1] = (i < 0 ? line : line.slice(0, i)).trim(); if (i >= 0) o[k2] = line.slice(i + 1).trim(); return o; };

let post;
if (args.json) {
  const raw = args.json === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(args.json), 'utf8');
  post = JSON.parse(raw);
} else {
  if (!args['body-file'] && !args.body) { console.error('--body-file 또는 --body 가 필요합니다'); process.exit(1); }
  post = {
    title: args.title,
    slug: args.slug,
    date: args.date,
    summary: args.summary,
    tags: args.tags ? args.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    author: args.author,
    body: args['body-file'] ? readFileSync(resolve(args['body-file']), 'utf8') : args.body,
    faq: args.faq.map((l) => pair(l, 'q', 'a')).filter((f) => f.q && f.a),
    sources: args.source.map((l) => pair(l, 'title', 'url')),
  };
}
post.slug = post.slug || slugify(post.title);
post.id = post.id || post.slug;
post.date = post.date || today;
post.body = String(post.body || '').replace(/\r\n/g, '\n').trim();
if (!post.summary) post.summary = post.body.split(/\n\s*\n/).find((b) => b && !/^(## |- |!\[)/.test(b.trim()))?.trim().slice(0, 120) || '';
if (!post.tags) post.tags = [];
if (!post.author) delete post.author;
if (!post.faq || !post.faq.length) delete post.faq;
if (!post.sources || !post.sources.length) delete post.sources;
if (!post.title || !post.body) { console.error('title 과 body 는 필수입니다'); process.exit(1); }

const posts = JSON.parse(readFileSync(POSTS, 'utf8'));
const idx = posts.findIndex((p) => (p.slug || p.id) === post.slug);
if (idx >= 0) {
  if (!args.update) { console.error(`같은 슬러그의 글이 이미 있습니다: ${post.slug}  (덮어쓰려면 --update)`); process.exit(1); }
  post = { ...posts[idx], ...post, updated: today };
  posts[idx] = post;
} else posts.push(post);
writeFileSync(POSTS, JSON.stringify(posts, null, 2) + '\n');
console.log(`${idx >= 0 ? '수정' : '추가'}: ${post.title} → blog/${post.slug}.html`);

if (!args['no-build']) execFileSync(process.execPath, [join(root, 'build.mjs')], { stdio: 'inherit' });
