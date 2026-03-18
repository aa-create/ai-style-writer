# AI 学你写

基于 Next.js 14 的中文写稿与风格训练工具。项目连接 MemFire Cloud（Supabase 兼容）做认证和数据存储，通过 OpenAI 兼容接口调用 DeepSeek / Kimi 等模型。

## 技术栈

- Next.js 14 + App Router + TypeScript
- Tailwind CSS
- MemFire Cloud / Supabase SDK
- DeepSeek / Kimi（OpenAI 兼容接口）
- mammoth / pdf-parse

## 主要功能

- 邮箱登录与注册
- 对话式写稿
- 风格训练与范文学习
- 已学范文记录管理
- PDF / DOCX / TXT / MD 文本解析

## 本地开发

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。

## 环境变量

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
```

说明：
- 即使使用 MemFire Cloud，环境变量名仍保持 `SUPABASE_` 前缀。
- `.env.local` 不应提交到 Git。

## 常用命令

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## 目录结构

```text
src/
  app/
    page.tsx
    login/page.tsx
    app/
      layout.tsx
      write/page.tsx
      train/page.tsx
    api/
      analyze/route.ts
      generate/route.ts
      history/route.ts
      learn/route.ts
      learned/[id]/route.ts
      parse-pdf/route.ts
      style/route.ts
  components/
  lib/
    ai/
    supabase/
    defaults.ts
    file-parser.ts
    prompt-builder.ts
    style-service.ts
middleware.ts
```

## 数据库说明

当前代码依赖这些表：

- `user_global_phrases`
- `style_rules`
- `learned_articles`
- `generations`

并假设这些表都带 `user_id`，且已配置基于 `auth.uid() = user_id` 的 RLS 策略。

## 备注

- 当前版本主要面向桌面端，移动端可用。
- 如果切换到生产环境，按 `pnpm build` + `pnpm start` 部署即可，反向代理可放在 Nginx。
