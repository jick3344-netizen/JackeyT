# Lao Huang's Three Brand Questions

An invite-only brand strategy diagnosis tool for personal brands and company brands.

The tool asks three core questions:

- Who are you?
- Why should people choose you?
- Why should people believe you?

Based on the answers, it generates a structured brand diagnosis report covering positioning, value, and trust signals. The product includes a public-facing website, an admin panel, Netlify Functions, Netlify Blobs storage, and a WeChat Mini Program prototype.

## What This Project Includes

- Public landing page with invite-code access
- Personal brand and company brand questionnaires
- Required contact fields: name, contact method, and email
- Report generation workflow with loading and refresh states
- Admin dashboard for viewing submissions, answers, reports, and consultation requests
- Content management support for homepage copy, questionnaire fields, report settings, and assets
- Manual report revision support in the admin workflow
- Netlify Functions API
- Netlify Blobs based storage for production
- Local JSON storage for development
- WeChat Mini Program front-end prototype

## Open Source Version

This repository is a cleaned open-source version.

Personal QR codes, private user data, generated marketing assets, and local storage files are not included. The homepage image and contact QR code use SVG placeholders. Replace them in the admin panel or through your own deployed assets.

Do not commit real API keys, private invite codes, user submissions, or contact data.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- Node.js local development server
- Netlify Functions
- Netlify Blobs
- MiniMax report generation support
- Optional OpenAI-compatible report generation paths in the older local server
- WeChat Mini Program pages

## Quick Start

```bash
npm install
npm run check
node server.js
```

Open:

```text
http://127.0.0.1:4188
```

Local demo invite code:

```text
LAOHUANG-2026
```

Local admin invite code:

```text
LAOHUANG-ADMIN
```

## Environment Variables

Create a local `.env` file when needed. Never commit real values.

```bash
MINIMAX_API_KEY=your_server_side_key
MINIMAX_MODEL=MiniMax-M3
OPENAI_API_KEY=your_server_side_key
AI_MODEL_REPORT=gpt-5.5
```

MiniMax is the preferred report generation provider in the Netlify Functions flow. Model keys must stay on the server side only.

## Netlify Deployment

The project includes:

```text
netlify.toml
netlify/functions/api.mts
netlify/functions/report-generator-background.mts
```

Netlify uses `public/` as the publish directory and `netlify/functions/` as the Functions directory.

For production, configure environment variables in Netlify:

```bash
MINIMAX_API_KEY=your_server_side_key
MINIMAX_MODEL=MiniMax-M3
```

Netlify Blobs is used to store users, invite codes, diagnoses, generated reports, content drafts, published content versions, and uploaded assets.

## Report Logic

The diagnosis focuses on three dimensions:

- Brand positioning: 35 points
- Brand value: 35 points
- Brand trust signals: 30 points

Each new diagnosis stores a snapshot of the questionnaire and report configuration so that future content changes do not rewrite older submissions.

## Security Notes

- Keep API keys in server-side environment variables.
- Do not store keys in front-end code.
- Do not commit local data files.
- Do not publish real user submissions.
- Replace placeholder assets before using the project commercially.

## License

No license has been added yet. Add a license before encouraging external reuse or contributions.

---

# 老黄的品牌三问

一个面向个人品牌和企业品牌的邀请制品牌战略诊断工具。

这套工具围绕三个核心问题展开：

- 你是谁？
- 别人为什么选择你？
- 别人凭什么相信你？

用户填写问卷后，系统会围绕品牌定位、品牌价值和品牌信任状生成诊断报告。项目包含独立站前台、管理后台、Netlify Functions、Netlify Blobs 存储，以及微信小程序原型。

## 项目包含什么

- 邀请码访问的前台页面
- 个人品牌和企业品牌两套问卷
- 必填联系信息：姓名、联系方式、邮箱
- 报告生成流程，包含等待和刷新领取状态
- 管理后台，可查看问卷、答案、报告和咨询意向
- 内容管理能力，可调整首页文案、问卷、报告设置和素材
- 单份报告的人工修订入口
- Netlify Functions 接口
- 线上使用 Netlify Blobs 存储
- 本地开发使用 JSON 文件存储
- 微信小程序前端原型

## 开源版说明

这个仓库是整理后的开源版本。

真实微信二维码、用户数据、生成图片和本地数据文件都没有放进仓库。首页主图和联系二维码使用了 SVG 占位图。你可以在后台或部署后的素材管理里替换成自己的图片。

不要把真实 API 密钥、私人邀请码、用户提交内容或联系方式提交到仓库。

## 技术栈

- 原生 HTML、CSS、JavaScript
- Node.js 本地开发服务
- Netlify Functions
- Netlify Blobs
- MiniMax 报告生成支持
- 旧本地服务中保留 OpenAI 兼容的报告生成路径
- 微信小程序页面

## 本地启动

```bash
npm install
npm run check
node server.js
```

打开：

```text
http://127.0.0.1:4188
```

本地演示邀请码：

```text
LAOHUANG-2026
```

本地管理员邀请码：

```text
LAOHUANG-ADMIN
```

## 环境变量

需要时创建本地 `.env` 文件。不要提交真实值。

```bash
MINIMAX_API_KEY=你的服务端密钥
MINIMAX_MODEL=MiniMax-M3
OPENAI_API_KEY=你的服务端密钥
AI_MODEL_REPORT=gpt-5.5
```

Netlify Functions 流程里优先使用 MiniMax 生成报告。模型密钥只能保存在服务端环境变量里。

## Netlify 部署

项目包含：

```text
netlify.toml
netlify/functions/api.mts
netlify/functions/report-generator-background.mts
```

Netlify 使用 `public/` 作为发布目录，使用 `netlify/functions/` 作为函数目录。

正式部署时，在 Netlify 项目环境变量里配置：

```bash
MINIMAX_API_KEY=你的服务端密钥
MINIMAX_MODEL=MiniMax-M3
```

Netlify Blobs 用于保存用户、邀请码、诊断记录、生成报告、内容草稿、已发布内容版本和上传素材。

## 报告逻辑

诊断围绕三个维度：

- 品牌定位：35 分
- 品牌价值：35 分
- 品牌信任状：30 分

每次新建诊断时，会保存当时的问卷和报告配置快照，避免后续后台内容调整影响历史记录。

## 安全说明

- API 密钥只放在服务端环境变量里。
- 不要把密钥写进前端代码。
- 不要提交本地数据文件。
- 不要公开真实用户提交内容。
- 商业使用前，请替换占位素材。

## License

目前还没有添加开源许可证。如果希望别人正式复用或参与贡献，建议后续补充许可证。
