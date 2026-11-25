import { readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const origin = process.env.SITE_URL || 'https://keithylq-ctrl.github.io';
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dateLabel = (value) => value.replaceAll('-', '/');
const links = [['/', '首页'], ['/about/', '关于'], ['/work/', '项目'], ['/notes/', '文章'], ['/now/', '近况']];

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdown(source) {
  const lines = source.trim().split(/\r?\n/);
  const html = [];
  let list = null;
  let paragraph = [];
  const flushParagraph = () => { if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; };
  const closeList = () => { if (list) html.push(`</${list}>`); list = null; };
  for (const line of lines) {
    const value = line.trim();
    if (!value) { flushParagraph(); closeList(); continue; }
    const heading = value.match(/^(#{2,3})\s+(.+)$/);
    const item = value.match(/^(?:- |\d+\. )(.+)$/);
    if (heading) { flushParagraph(); closeList(); const level = heading[1].length; html.push(`<h${level}>${inline(heading[2])}</h${level}>`); }
    else if (item) { flushParagraph(); const kind = /^\d/.test(value) ? 'ol' : 'ul'; if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; } html.push(`<li>${inline(item[1])}</li>`); }
    else if (value.startsWith('> ')) { flushParagraph(); closeList(); html.push(`<blockquote>${inline(value.slice(2))}</blockquote>`); }
    else { closeList(); paragraph.push(value); }
  }
  flushParagraph(); closeList();
  return html.join('\n');
}

function frontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter: ${file}`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([a-z]+):\s*(.*)$/);
    if (pair) data[pair[1]] = pair[2].trim();
  }
  for (const key of ['title', 'description', 'date', 'category']) if (!data[key]) throw new Error(`Missing ${key}: ${file}`);
  data.tags = (data.tags || '').replace(/^\[/, '').replace(/\]$/, '').split(',').map(x => x.trim()).filter(Boolean);
  data.draft = data.draft === 'true';
  return { data, body: match[2] };
}

function entries(kind) {
  return readdirSync(join(root, 'src/content', kind)).filter(x => x.endsWith('.md')).map(file => ({
    slug: file.slice(0, -3),
    ...frontmatter(join(root, 'src/content', kind, file))
  })).filter(x => !x.data.draft).sort((a, b) => b.data.date.localeCompare(a.data.date));
}

function page(name) { return markdown(readFileSync(join(root, 'src/content/pages', `${name}.md`), 'utf8')); }

function layout(path, title, description, body) {
  const nav = links.map(([href, label]) => `<a href="${href}"${path === href || (href !== '/' && path.startsWith(href)) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const canonical = new URL(path, origin).href;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#ffffff"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${escapeHtml(title === 'keithylq' ? title : `${title} · keithylq`)}</title><style>${css}</style></head><body><div class="site-shell wrap"><header class="site-header"><a class="brand" href="/">keithylq</a><nav aria-label="主导航">${nav}</nav></header><main>${body}</main><footer class="site-footer"><span>© keithylq</span><a href="https://github.com/keithylq-ctrl">GitHub ↗</a></footer></div></body></html>`;
}

function write(path, html) {
  const target = join(out, path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

const notes = entries('notes');
const projects = entries('projects');
const projectRow = ({ slug, data }) => `<li><a href="/work/${slug}/">${escapeHtml(data.title)}</a><span>${escapeHtml(data.stage || data.category)}</span><p>${escapeHtml(data.description)}</p></li>`;
const noteRow = ({ slug, data }) => `<li><time datetime="${escapeHtml(data.date)}">${dateLabel(data.date)}</time><a href="/notes/${slug}/">${escapeHtml(data.title)}</a><p>${escapeHtml(data.description)}</p></li>`;
const section = (title, content) => `<section class="section"><h2>${title}</h2>${content}</section>`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(join(root, 'public/favicon.svg'), join(out, 'favicon.svg'));
writeFileSync(join(out, '.nojekyll'), '');

write('', layout('/', 'keithylq', 'keithylq 的个人主页：项目、文章与持续中的思考。', `<section class="home-intro"><h1>keithylq</h1><div class="prose">${page('home')}</div></section>${section('项目', `<ul class="entry-list">${projects.slice(0, 2).map(projectRow).join('')}</ul><a class="more" href="/work/">查看全部项目 →</a>`)}${section('最近文章', `<ul class="entry-list notes">${notes.slice(0, 3).map(noteRow).join('')}</ul><a class="more" href="/notes/">查看全部文章 →</a>`)}`));
write('about', layout('/about/', '关于', '关于 keithylq。', `<header class="page-heading"><h1>关于</h1></header><article class="prose">${page('about')}</article>`));
write('now', layout('/now/', '近况', 'keithylq 的近期关注。', `<header class="page-heading"><h1>近况</h1></header><article class="prose">${page('now')}</article>`));
write('work', layout('/work/', '项目', 'keithylq 的项目记录。', `<header class="page-heading"><h1>项目</h1><p>问题、方法与阶段性成果。</p></header><ul class="entry-list">${projects.map(projectRow).join('')}</ul>`));
write('notes', layout('/notes/', '文章', 'keithylq 的文章与札记。', `<header class="page-heading"><h1>文章</h1><p>学习、实践与生活中的思考。</p></header><ul class="entry-list notes">${notes.map(noteRow).join('')}</ul>`));

for (const [kind, collection, back] of [['work', projects, '项目'], ['notes', notes, '文章']]) {
  for (const { slug, data, body } of collection) {
    const path = `/${kind}/${slug}/`;
    write(`${kind}/${slug}`, layout(path, data.title, data.description, `<header class="page-heading"><a class="backlink" href="/${kind}/">← ${back}</a><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.description)}</p><div class="meta"><time datetime="${escapeHtml(data.date)}">${dateLabel(data.date)}</time><span>${escapeHtml(data.category)}</span></div></header><article class="prose">${markdown(body)}</article>`));
  }
}

writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
const urls = ['/', '/about/', '/work/', '/notes/', '/now/', ...projects.map(x => `/work/${x.slug}/`), ...notes.map(x => `/notes/${x.slug}/`)];
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${new URL(path, origin).href}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${urls.length} pages in ${out}`);
