# keithylq的个人网站

使用零依赖的 Node.js 构建脚本与 Markdown 内容，适合部署到 GitHub Pages。

## 本地运行

```bash
npm run build
npm run dev
```

打开终端输出的本地地址。生成文件在 `dist/`。需要 Node.js 22 或更高版本，无需安装 npm 包。

## 发布文章或项目

- 札记放入 `src/content/notes/`。
- 项目放入 `src/content/projects/`，需填写 `stage` 字段。
- 每篇文件开头填写标题、简介、日期、分类和标签。
- 尚未公开的文章设置 `draft: true`，构建时不会出现在网站中。
- `Now` 与 `About` 页面编辑 `scripts/build.mjs` 中的对应内容。

原始日记、工作材料、健康资料等不应复制到此仓库。发布前请核对文章事实、隐私、版权与工作相关的信息。

## GitHub Pages 发布

1. 在 GitHub 账号 `keithylq-ctrl` 下创建公开仓库 `keithylq-ctrl.github.io`。
2. 将本文件夹内容提交并推送到仓库的 `main` 分支。
3. 在仓库 Settings → Pages 中，把 Build and deployment 的 Source 设为 **GitHub Actions**。
4. `.github/workflows/deploy.yml` 会在推送后自动构建和发布。

工作流通过 `SITE_URL` 设置正式网站地址，本地构建默认使用 `https://keithylq-ctrl.github.io`。
