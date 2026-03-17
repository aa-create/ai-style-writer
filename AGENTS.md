# AGENTS.md — Codex 行为规范

## 技术栈

- **框架**：Next.js 14 (App Router) + TypeScript
- **样式**：Tailwind CSS
- **数据库 + 认证**：MemFire Cloud（Supabase 兼容，数据在国内，API 用 @supabase/supabase-js 同一个 SDK）
- **AI 接口**：OpenAI 兼容格式（DeepSeek / Kimi），统一封装
- **文件存储**：腾讯云 COS（存用户上传的附件和导出文件）
- **部署**：腾讯云轻量服务器（PM2 跑 Next.js）
- **文件解析**：mammoth (docx)、pdf-parse (pdf，服务端)
- **本地开发**：pnpm dev 跑 localhost:3000，连 MemFire Cloud 远程数据库

## 代码规范

- 使用中文注释
- 组件用 `.tsx`，工具函数用 `.ts`
- API 路由放在 `src/app/api/` 下
- 所有 AI 调用必须通过 `src/lib/ai/client.ts` 统一封装，禁止在其他文件直接调 fetch
- 禁止在前端暴露任何 API Key，AI 调用只走服务端 API Routes
- 所有数据库操作必须通过 `src/lib/style-service.ts` 进行，API 路由和页面组件禁止直接 import Supabase 客户端做数据查询。这样未来换数据库只需改这一个文件。
- 单个文件不超过 300 行，超了就拆分
- 使用 pnpm 作为包管理器
- AI 返回 JSON 时必须做清洗：`text.replace(/```json|```/g, '').trim()`

## 环境变量

```
# MemFire Cloud（Supabase 兼容）
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.memfiredb.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI 模型
AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat

# 腾讯云 COS（后续存附件/导出用，MVP 可先不填）
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
```

## 目录结构

```
ai-style-writer/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 首页（未登录看介绍，已登录跳写稿）
│   │   ├── login/
│   │   │   └── page.tsx              # 邮箱登录注册
│   │   ├── app/
│   │   │   ├── layout.tsx            # 主布局（顶栏 + tab 导航）
│   │   │   ├── write/
│   │   │   │   └── page.tsx          # 写稿（两步生成）
│   │   │   └── train/
│   │   │       └── page.tsx          # 风格训练
│   │   └── api/
│   │       ├── extract/
│   │       │   └── route.ts          # 提取要点（非 streaming）
│   │       ├── generate/
│   │       │   └── route.ts          # 生成全文（streaming SSE）
│   │       ├── analyze/
│   │       │   └── route.ts          # 分析范文（非 streaming）
│   │       ├── learn/
│   │       │   └── route.ts          # 确认学习写入风格库
│   │       ├── style/
│   │       │   └── route.ts          # GET 读取 / PATCH 更新风格库
│   │       └── parse-pdf/
│   │           └── route.ts          # PDF 服务端解析
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # 浏览器端客户端（SDK 用 @supabase/supabase-js，连 MemFire Cloud）
│   │   │   └── server.ts             # 服务端客户端（用 cookies）
│   │   ├── ai/
│   │   │   ├── client.ts             # 统一 AI 调用（OpenAI 兼容格式）
│   │   │   └── stream.ts             # SSE 流式响应辅助函数
│   │   ├── file-parser.ts            # 文件解析（txt/md/docx 前端，pdf 走 API）
│   │   ├── style-service.ts          # 风格库 CRUD（全局词汇 + 类型规则，合并逻辑）
│   │   ├── prompt-builder.ts         # Prompt 动态拼装
│   │   └── defaults.ts               # 默认风格库数据
│   ├── components/
│   │   ├── ExtractedPoints.tsx        # 要点确认卡片（可编辑）
│   │   ├── StreamingOutput.tsx        # 流式输出展示
│   │   ├── PhraseManager.tsx          # 词汇库管理（tag 展示 + 增删）
│   │   ├── AnalysisResult.tsx         # 范文六维分析结果展示
│   │   └── FileUpload.tsx             # 文件上传组件
│   └── middleware.ts                  # 未登录重定向到 /login
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── AGENTS.md                          # 本文件
└── PROJECT.md                         # 产品说明书
```

## UI 风格

- 干净简约，白底，中文无衬线字体
- 最大宽度 800px 居中
- 移动端可用但主要面向桌面
- 所有 loading 状态要有骨架屏或文字提示
- 错误时显示友好提示 + 重试按钮
- 复制按钮点击后变为"已复制 ✓"，2 秒后恢复

## MemFire Cloud RLS 规则

MemFire Cloud 兼容 Supabase 的 RLS（行级安全）。每张表（user_global_phrases、style_rules、learned_articles、generations）都使用同一条策略：`auth.uid() = user_id`，确保用户只能读写自己的数据。用服务端客户端（service role key）做写入操作时不受 RLS 限制。

**注意**：代码里依然用 `@supabase/supabase-js` 这个 SDK，只是连接地址指向 MemFire Cloud。如果未来要换回 Supabase 或自建 PostgreSQL，只需改 `.env.local` 里的 URL 和 Key。

## AI 接口封装要求

```typescript
// src/lib/ai/client.ts 的核心结构
// 使用 OpenAI 兼容格式，这样 DeepSeek 和 Kimi 都能用
const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AI_API_KEY}`,
  },
  body: JSON.stringify({
    model: AI_MODEL,
    messages: messages,
    stream: options?.stream ?? false,
    temperature: options?.temperature ?? 0.7,
  }),
});
// 换模型只需改 .env.local 里三个变量
```

## 部署方式

### 本地开发（当前阶段）
```bash
pnpm dev
# 访问 http://localhost:3000
# 数据库连接 MemFire Cloud 远程实例，AI 调用 DeepSeek API
# 本地开发不需要域名备案和服务器
```

### 生产部署（域名备案后）
- 腾讯云轻量服务器，Ubuntu 系统
- 安装 Node.js 18+ 和 PM2
- `pnpm build` 构建，`pm2 start npm -- start` 运行
- Nginx 反向代理 + SSL 证书（腾讯云免费证书）
- 可配合 GitHub Actions 实现 push 自动部署

### 服务器注意事项
- Next.js 默认监听 3000 端口，Nginx 反向代理到 80/443
- 非 streaming 的 API 路由（extract / analyze）如果 AI 响应慢，注意 Nginx 的 proxy_read_timeout 设大一些（建议 120s）
- 上传文件大小限制在 Nginx 里配置 `client_max_body_size 10m`
- 环境变量放在服务器的 `.env.local` 文件里或用 PM2 的 ecosystem 配置
