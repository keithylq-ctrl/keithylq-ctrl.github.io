# keithylq 的个人网站

使用零依赖的 Node.js 构建脚本与 Markdown 内容，适合部署到 GitHub Pages。

## 本地运行

```bash
npm run build
npm run dev
```

打开终端输出的本地地址。生成文件在 `dist/`。需要 Node.js 22 或更高版本，无需安装 npm 包。

## 手动编辑网站

- 首页：编辑 `src/content/pages/home.md`。
- 关于和公开简历：编辑 `src/content/pages/about.md`。
- 近况：编辑 `src/content/pages/now.md`。
- 新文章：复制 `src/content/notes/` 中的一篇 Markdown 文件，改文件名、开头信息和正文。
- 新项目：复制 `src/content/projects/` 中的一篇 Markdown 文件，另填 `stage` 字段。
- 文章和项目开头需要 `title`、`description`、`date`、`category`；`tags` 可选。
- 尚未公开的文章设置 `draft: true`，构建时不会出现在网站中。

可以直接在 GitHub 仓库里打开对应文件，点击铅笔图标编辑，提交后 GitHub Actions 会重新生成网站。正文支持段落、二三级标题、列表、粗体和链接；需要改变导航或样式时再修改构建脚本与 CSS。

原始日记、工作材料、健康资料等不应复制到此仓库。发布前请核对文章事实、隐私、版权与工作相关的信息。

## GitHub Pages 发布

1. 将本文件夹内容提交并推送到 `keithylq-ctrl/keithylq-ctrl.github.io` 的 `main` 分支。
2. 在仓库 Settings → Pages 中，把 Build and deployment 的 Source 设为 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 会在推送后自动构建和发布。

工作流通过 `SITE_URL` 设置正式网站地址，本地构建默认使用 `https://keithylq-ctrl.github.io`。
