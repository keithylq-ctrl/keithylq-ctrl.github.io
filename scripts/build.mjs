import { readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const origin = process.env.SITE_URL || 'https://keithylq-ctrl.github.io';
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dateLabel = (value) => value.replaceAll('-', '/');
const links = [['/', '首页'], ['/work/', '项目'], ['/notes/', '札记'], ['/now/', '此刻'], ['/about/', '关于']];

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

function layout(path, title, description, body) {
  const nav = links.map(([href, label]) => `<a href="${href}"${path === href || (href !== '/' && path.startsWith(href)) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const canonical = new URL(path, origin).href;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#f7f4ee"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${escapeHtml(title === '羊柳青' ? title : `${title} · 羊柳青`)}</title><style>${css}</style></head><body><div id="top" class="site-shell"><header class="site-header wrap"><a class="brand" href="/" aria-label="羊柳青，返回首页"><span class="brand-mark">柳</span><span>羊柳青<span class="brand-dot">.</span></span></a><nav aria-label="主导航">${nav}</nav></header><main>${body}</main><footer class="site-footer wrap"><span>羊柳青 · 持续记录，持续生长</span><a href="#top">回到顶部 ↑</a></footer></div></body></html>`;
}

function write(path, html) {
  const target = join(out, path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

const notes = entries('notes');
const projects = entries('projects');
const projectCard = ({ slug, data }) => `<a class="card" href="/work/${slug}/"><div class="card-top"><span>${escapeHtml(data.category)}</span><span>${escapeHtml(data.stage || '')}</span></div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p><div class="card-bottom"><span>${escapeHtml(data.tags.join(' · '))}</span><span>阅读 →</span></div></a>`;
const noteRow = ({ slug, data }) => `<a class="note-row" href="/notes/${slug}/"><time datetime="${escapeHtml(data.date)}">${dateLabel(data.date)}</time><div><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p></div><span class="arrow">↗</span></a>`;
const sectionHead = (number, english, title, href, label) => `<div class="section-head"><div><div class="eyebrow">${number} / ${english}</div><h2>${title}</h2></div>${href ? `<a href="${href}">${label} ↗</a>` : ''}</div>`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(join(root, 'public/favicon.svg'), join(out, 'favicon.svg'));
writeFileSync(join(out, '.nojekyll'), '');

write('', layout('/', '羊柳青', '羊柳青的个人网站：关于农业、数据、人工智能与身体实践的持续记录。', `
<section class="hero wrap"><div><div class="eyebrow">A living archive · 持续更新中</div><h1>在研究与生活之间，<br><em>寻找自己的方向。</em></h1><p>你好，我是羊柳青。我关注农业与数据，也正在学习人工智能；在工作与研究之外，我通过健身和八卦掌认识身体。这里记录做过的事，以及仍在认真思考的问题。</p><div class="hero-actions"><a class="button primary" href="/work/">看看我的项目 <span>↗</span></a><a class="button ghost" href="/about/">认识我 <span>→</span></a></div></div><div class="hero-art" aria-hidden="true"><span class="art-leaf one"></span><span class="art-leaf two"></span><span class="art-leaf three"></span><span class="art-word">GROWING, IN MY OWN WAY.</span></div></section>
<section class="section wrap">${sectionHead('01','About this space','一个尚在生长的个人空间')}<div class="intro-grid"><p>我想把工作、研究与生活里的发现，慢慢沉淀成能被阅读、讨论和继续改进的作品。它们不必一开始就完整，但值得诚实地记录。</p><div><p>目前这里有项目记录、学习札记与一个不断更新的“此刻”页面。我尤其关心：技术如何解决真实问题，身体练习如何改变人，以及怎样获得更自由的心灵。</p><div class="keywords"><span class="pill">农业与数据</span><span class="pill">人工智能学习</span><span class="pill">身体实践</span><span class="pill">持续写作</span></div></div></div></section>
<section class="section wrap">${sectionHead('02','Selected work','正在做的事','/work/','全部项目')}<div class="cards">${projects.slice(0,2).map(projectCard).join('')}</div></section>
<section class="section wrap">${sectionHead('03','Field notes','最近的札记','/notes/','全部札记')}<div class="note-list">${notes.slice(0,3).map(noteRow).join('')}</div></section>`));

write('work', layout('/work/', '项目', '羊柳青的研究、学习与实践项目。', `<section class="page-hero wrap"><div class="eyebrow">Work / Projects</div><h1 class="page-title">做过的，与正在做的</h1><p>这些页面记录问题、过程和阶段性成果。进展会持续更新。</p></section><section class="page-content wrap"><div class="cards">${projects.map(projectCard).join('')}</div></section>`));
write('notes', layout('/notes/', '札记', '关于研究、学习、身体实践与生活的札记。', `<section class="page-hero wrap"><div class="eyebrow">Notes / Journal</div><h1 class="page-title">把问题写下来</h1><p>这里是思考的过程，而非一份已经写好的答案。记录读到的、试过的，以及改变了我看法的事。</p></section><section class="page-content wrap"><div class="note-list">${notes.map(noteRow).join('')}</div></section>`));

for (const [kind, collection, back] of [['work', projects, '项目'], ['notes', notes, '札记']]) {
  for (const { slug, data, body } of collection) {
    const path = `/${kind}/${slug}/`;
    write(`${kind}/${slug}`, layout(path, data.title, data.description, `<section class="page-hero wrap"><div class="eyebrow">${escapeHtml(data.category)} / ${kind === 'work' ? escapeHtml(data.stage) : 'Notes'}</div><h1 class="page-title">${escapeHtml(data.title)}</h1><p>${escapeHtml(data.description)}</p><div class="article-meta"><time datetime="${escapeHtml(data.date)}">${dateLabel(data.date)}</time><span>${escapeHtml(data.tags.join(' · '))}</span></div></section><article class="page-content wrap"><div class="prose">${markdown(body)}</div><a class="backlink" href="/${kind}/">← 返回${back}</a></article>`));
  }
}

write('now', layout('/now/', '此刻', '羊柳青当前的学习、研究与身体实践。', `<section class="page-hero wrap"><div class="eyebrow">Now / 2026.11</div><h1 class="page-title">此刻，正在路上</h1><p>一页会随时间改变的近况。它帮助我记住，自己现在把注意力放在哪里。</p></section><section class="page-content wrap"><div class="now-grid"><div class="now-item"><span class="number">01 / 学习</span><h2 class="serif">建立机器学习的整体地图</h2><p>从已经掌握的 Python 与数据技能出发，理解模型、验证和预测的基本原理，并把学习用于实际问题。</p></div><div class="now-item"><span class="number">02 / 项目</span><h2 class="serif">准备数据分析比赛</h2><p>与四人团队一起准备 2027 年 IISE DAIS 学生数据分析竞赛。当前重点是学习方法与组织协作。</p></div><div class="now-item"><span class="number">03 / 身体</span><h2 class="serif">持续练习</h2><p>健身与八卦掌是我认识身体的两条路径。我想更具体地理解：练习如何改变人的状态。</p></div><div class="now-item"><span class="number">04 / 写作</span><h2 class="serif">把思考变成作品</h2><p>建立自己的公开写作空间，让零散的想法逐步形成能交流、能回看的文字。</p></div></div><div class="accent-panel"><div class="eyebrow">A question I keep asking</div><p class="serif">怎样做着真正喜欢的事，获得收入，也保有对时间、注意力与尊严的掌控？</p></div></section>`));

write('about', layout('/about/', '关于', '关于羊柳青，以及这个网站的缘起。', `<section class="page-hero wrap"><div class="eyebrow">About / 羊柳青</div><h1 class="page-title">你好，我是羊柳青。</h1><p>在农业、数据与个人实践的交汇处，寻找值得长期投入的方向。</p></section><section class="page-content wrap"><div class="prose"><p>我对农业与数据有关的问题感兴趣，也在学习机器学习，希望把技术用在真实问题上。目前，我正与团队准备数据分析竞赛。</p><p>工作与学习之外，我练习健身和八卦掌，也持续思考怎样拥有气血饱满的身体、自由的心灵，以及一种让自己心动的生活。</p><h2>这个网站为什么存在</h2><p>我希望留下的不只是履历，也包括项目的过程、尚未解答的问题、读书与练习中的发现。这些内容会随我的认识改变而更新。</p><h2>关于简历与联系</h2><p>公开简历和联系方式将在我核对内容后补充。现阶段，你可以先从<a href="/work/">项目</a>与<a href="/notes/">札记</a>了解我正在做的事。</p></div></section>`));

writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
const urls = ['/', '/work/', '/notes/', '/now/', '/about/', ...projects.map(x => `/work/${x.slug}/`), ...notes.map(x => `/notes/${x.slug}/`)];
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${new URL(path, origin).href}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${urls.length} pages in ${out}`);
