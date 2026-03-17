# PROJECT.md — 产品说明书

## 一、产品定位

**AI 学你写** — AI 写作风格训练器

核心理念：其他工具是"AI 帮你写"，我们是"AI 学你写"。
用户上传范文 → 系统提炼写作规则 → 生成时自动应用个人风格。
越用越懂你，风格库越积越厚。

MVP 范围：仅做「宣传文稿」，架构预留多类型扩展。

---

## 二、页面与交互

### 2.1 首页 `/`

- 已登录 → 直接跳转 `/app/write`
- 未登录 → 显示产品介绍 + 登录按钮
- 标题：AI 学你写 — 越用越懂你的写作风格
- 三个卖点：学习你的风格 / 两步确认生成 / 风格库越积越厚

### 2.2 登录页 `/login`

- 邮箱 + 密码登录（MemFire Cloud Auth，兼容 Supabase Auth API）
- 支持注册（第一次自动注册）
- 登录成功跳转 `/app/write`
- 后续可加微信登录（MemFire Cloud 原生支持）

### 2.3 主布局 `/app/layout.tsx`

- 顶部导航栏，两个 tab：「写稿」「风格训练」
- 顶栏右侧显示风格库状态：「已学 N 篇范文 · N 个词汇」
- 居中容器，最大宽度 800px

### 2.4 写稿页 `/app/write`（核心页面）

**两步生成流程：**

```
┌─────────────────────────────────────────────┐
│  输入区                                      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 大 textarea                           │  │
│  │ placeholder: "把你想写的内容随便说说…"   │  │
│  │ 比如：上周搞了个反诈宣传活动，联合       │  │
│  │ 派出所，在菜市场门口摆摊发传单500多份…  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [📎 上传附件]    字诀式 / 动宾式 / 聚焦式   │
│                                             │
│  [        提取要点        ]                  │
└─────────────────────────────────────────────┘
          │
          ▼ POST /api/extract
┌─────────────────────────────────────────────┐
│  要点确认卡片（可编辑）                       │
│                                             │
│  主题：[反诈宣传活动_____________]           │
│  参与单位：[社区、派出所__________]          │
│  具体举措：[摆摊宣传、发传单、现身说法]      │
│  成效数据：[传单500余份，参与200余人]        │
│                                             │
│  ⚠ AI 建议补充：                            │
│  · 具体社区名称？                           │
│  · 活动具体日期？                           │
│                                             │
│  [返回修改原文]          [确认，开始生成 →]   │
└─────────────────────────────────────────────┘
          │
          ▼ POST /api/generate (streaming)
┌─────────────────────────────────────────────┐
│  生成结果（流式输出）                        │
│                                             │
│  标题...                                    │
│  导语段...                                  │
│  一、小标题1...                              │
│  ...                                        │
│                                             │
│  [复制]                                     │
└─────────────────────────────────────────────┘
          │
          ▼ 自动存入 generations 表
```

**交互细节：**
- 上传附件支持 .txt .md .docx .pdf，解析出文本后追加到 textarea 或内部拼接
- 上传后显示文件名 tag，可点 x 移除
- "返回修改原文"回到第一步，保留 textarea 内容
- 生成完毕自动滚动到结果区域
- textarea 支持 Ctrl+Enter 触发提取

### 2.5 风格训练页 `/app/train`

**上方：学习新范文**

- 两种输入方式（tab 切换）：
  - Tab 1「粘贴文本」：大 textarea
  - Tab 2「上传文件」：上传按钮（.txt .md .docx .pdf），显示文件名和预览前 200 字
- 「分析范文」按钮 → POST /api/analyze
- 分析结果展示为六张小卡片，每张一个维度
- 四字词卡片里标注新旧：新的 = 绿色 tag，已有 = 灰色 tag
- 两个按钮：「放弃」和「确认学习」
- 确认后显示 toast："已学习！新增 N 个词汇"

**下方：我的风格库**

- 词汇库（显示的是全局词汇，所有材料类型共享）：
  - 按分类（举措/成效/政治/自定义）展示 tag
  - 内置分类只展示不可删
  - 自定义可删除（x 按钮）
  - 底部输入框 + 添加按钮（添加到全局词汇的"自定义"分类）
- 已学范文列表：前 80 字预览 + 材料类型标签 + 时间 + 删除按钮
- 统计：已学 N 篇，全局词汇 N 个

---

## 三、数据库（MemFire Cloud，Supabase 兼容）

在 MemFire Cloud 控制台的 SQL 编辑器中执行（操作方式与 Supabase 一致）：

```sql
-- 1. 全局词汇库（跨材料类型共享，每用户一条）
create table user_global_phrases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  phrases jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 类型专属规则（每用户每类型一条，存规则+类型专属词汇+小标题模板）
create table style_rules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  material_type text default 'propaganda' not null,
  rules jsonb not null default '{}',
  type_phrases jsonb not null default '{}',
  subtitle_styles jsonb not null default '[]',
  stats jsonb not null default '{"learned_count": 0}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, material_type)
);

-- 3. 已学范文（带 material_type 标记来源）
create table learned_articles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  material_type text default 'propaganda' not null,
  preview text not null,
  analysis jsonb not null default '{}',
  created_at timestamptz default now()
);

-- 4. 生成记录（带 material_type）
create table generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  material_type text default 'propaganda' not null,
  raw_input text,
  extracted_points jsonb,
  output text,
  style_used text,
  created_at timestamptz default now()
);

-- 5. RLS
alter table user_global_phrases enable row level security;
alter table style_rules enable row level security;
alter table learned_articles enable row level security;
alter table generations enable row level security;

create policy "own_data" on user_global_phrases for all using (auth.uid() = user_id);
create policy "own_data" on style_rules for all using (auth.uid() = user_id);
create policy "own_data" on learned_articles for all using (auth.uid() = user_id);
create policy "own_data" on generations for all using (auth.uid() = user_id);
```

---

## 四、新用户默认数据

用户首次登录时，检测无记录则自动插入两条数据：

**user_global_phrases（全局词汇，跨所有材料类型共享）：**

```json
{
  "phrases": {
    "政治": ["贯彻落实", "决策部署", "高质量发展", "守正创新"],
    "举措": ["走深走实", "持续发力", "凝心聚力", "多措并举", "统筹推进"],
    "成效": ["入脑入心", "见行见效", "提质增效", "成效显著"],
    "自定义": []
  }
}
```

**style_rules（宣传稿类型专属规则）：**

```json
{
  "material_type": "propaganda",
  "rules": {
    "title_max_length": 30,
    "title_pattern": "【单位】+【动作】+【目标】",
    "body_paragraphs": "3-4段",
    "paragraph_structure": "小标题→展开句→举例句→成效句",
    "max_chars_per_paragraph": 200
  },
  "type_phrases": {
    "自定义": []
  },
  "subtitle_styles": [
    { "name": "字诀式", "pattern": "以\"X\"字+动词短语", "example": "以\"实\"字当头 扎实推进基层治理" },
    { "name": "动宾式", "pattern": "动词+宾语+补充", "example": "强化阵地建设 筑牢思想根基" },
    { "name": "聚焦式", "pattern": "聚焦/依托+名词+动词", "example": "聚焦关键环节 推动改革落地" }
  ],
  "stats": { "learned_count": 0 }
}
```

**扩展示例：未来新增"工作总结"类型时，只需插入一条新的 style_rules：**

```json
{
  "material_type": "work_summary",
  "rules": {
    "title_max_length": 40,
    "title_pattern": "关于+【时间段】+【工作主题】+的总结",
    "body_paragraphs": "4-5段",
    "paragraph_structure": "回顾→措施→数据→不足→下一步",
    "max_chars_per_paragraph": 300,
    "allow_first_person": true
  },
  "type_phrases": {
    "自定义": []
  },
  "subtitle_styles": [
    { "name": "时间线式", "pattern": "第一阶段/第二阶段…", "example": "第一阶段：动员部署（1-3月）" },
    { "name": "维度式", "pattern": "在XX方面/在XX领域", "example": "在队伍建设方面" }
  ],
  "stats": { "learned_count": 0 }
}
```

全局词汇库自动继承，用户之前学的所有四字词不需要重新积累。

---

## 五、API 接口

| 方法 | 路由 | 输入 | 输出 | 流式 |
|------|------|------|------|------|
| POST | /api/extract | `{ text: string }` | `{ topic, participants, actions, results, missing }` | 否 |
| POST | /api/generate | `{ points: object, subtitleStyle: string }` | SSE 文本流 | 是 |
| POST | /api/analyze | `{ text: string }` | 六维分析 JSON | 否 |
| POST | /api/learn | `{ articlePreview, analysis, materialType }` | `{ newPhraseCount: number }` | 否 |
| GET | /api/style | `?type=propaganda` | 合并后的完整风格库（global + type） | 否 |
| PATCH | /api/style | `{ action, phrase, scope? }` | 更新后的 phrases | 否 |
| POST | /api/parse-pdf | FormData(file) | `{ text: string }` | 否 |

**PATCH /api/style 说明：**
- `scope` 可选值：`"global"`（默认）或 `"type"`
- `scope: "global"` → 增删 user_global_phrases.phrases.自定义
- `scope: "type"` → 增删 style_rules.type_phrases.自定义（MVP 暂不用）
- 前端词汇管理界面操作的是全局词汇，所以默认 scope 就是 global

---

## 六、Prompt 模板

### Prompt 1：提取要点（/api/extract 使用）

```
System:
你是一个信息提取助手。用户会输入一段关于工作活动的描述，可能比较口语化和零散。
请提取宣传文稿所需的关键要点，返回纯 JSON（不要 markdown 代码块标记）：
{
  "topic": "核心活动主题（简练概括）",
  "participants": "参与的单位或人员",
  "actions": ["具体举措1", "具体举措2"],
  "results": "成效、数据、反馈",
  "missing": ["建议补充的信息1"]
}
某项信息文本中没有提到就填空字符串或空数组。
missing 里列出写宣传稿需要但用户没提供的关键信息。

User:
{用户输入的原文}
```

### Prompt 2：生成全文（/api/generate 使用）

```
System:
你是一位资深的体制内宣传文稿写作专家。

【写作规范】
- 标题：{rules.title_pattern}，不超过{rules.title_max_length}字
- 结构：导语段 + {rules.body_paragraphs}段正文
- 每段结构：{rules.paragraph_structure}
- 每段不超过{rules.max_chars_per_paragraph}字

【本次小标题风格：{选中的风格名}】
格式：{pattern}
示例：{example}

【词汇库（优先使用这些词，已合并全局+类型专属词汇）】
举措类：{merged_phrases.举措用 / 连接}
成效类：{merged_phrases.成效用 / 连接}
政治类：{merged_phrases.政治用 / 连接}
{如有自定义：}自定义：{merged_phrases.自定义用 / 连接}

【禁止事项】
不捏造数据/人名/地名，不用第一人称，不口语化，不超出用户事实范围。
信息不足的地方用【待补充：xxx】标注。

User:
请根据以下要点写一篇宣传文稿：
主题：{points.topic}
参与单位：{points.participants}
具体举措：{points.actions用、连接}
成效：{points.results}
```

### Prompt 3：分析范文（/api/analyze 使用）

```
System:
你是公文写作分析专家。分析范文的写作特征，返回纯 JSON（不要代码块标记）：
{
  "title_pattern": "标题结构规律",
  "intro_style": "导语句式特征",
  "subtitle_format": "小标题格式特征和示例",
  "four_char_phrases": ["四字词1", "四字词2"],
  "paragraph_style": "段落展开方式",
  "special_expressions": ["特殊表达1"]
}

User:
{范文全文}
```

---

## 七、Prompt 拼装逻辑（prompt-builder.ts）

生成全文时，后端按以下步骤拼装完整 prompt：

```
1. 从数据库读取当前用户的 user_global_phrases 记录（全局词汇）
2. 从数据库读取当前用户、当前 material_type 的 style_rules 记录（类型规则）
3. 合并词汇：global_phrases + type_phrases，按分类去重
   merged_phrases = {
     政治: [...global.政治],
     举措: [...global.举措],
     成效: [...global.成效],
     自定义: [...new Set([...global.自定义, ...type.自定义])]
   }
4. 取出 rules（写作规范）、subtitle_styles（小标题模板）
5. 根据用户选择的小标题风格，找到对应的 pattern 和 example
6. 将 merged_phrases 和 rules 填入 Prompt 2 模板
7. 将用户确认后的要点填入 User message
8. 调用 AI（streaming 模式）
```

---

## 八、风格学习写入逻辑（/api/learn）

```
1. 接收前端传来的 analysis JSON 和 material_type
2. 从 analysis.four_char_phrases 提取新词汇
3. 读取当前用户的 user_global_phrases.phrases（全局词汇库）
4. 对比：遍历所有分类，已有的跳过，新的追加到 global_phrases.自定义
   （四字词默认进全局库，因为词汇跨材料类型通用）
5. 更新 user_global_phrases 记录
6. 更新对应 material_type 的 style_rules.stats：learned_count + 1
7. 插入一条 learned_articles 记录（带 material_type 标记）
8. 返回 { newPhraseCount: 新增的词汇数 }
```

**为什么词汇默认进全局库？**
"走深走实""提质增效"这些四字词在宣传稿、工作总结、讲话稿里都能用。
用户从宣传稿范文里学到的好词，切到工作总结时应该自动可用，不需要重新积累。
只有极少数表达是某种材料类型独有的（比如讲话稿的口语化句式），
这些可以手动添加到 type_phrases 里（MVP 阶段 type_phrases 留空即可）。

---

## 九、文件解析逻辑

| 格式 | 解析位置 | 方法 |
|------|----------|------|
| .txt / .md | 前端 | FileReader 读取文本 |
| .docx | 前端 | mammoth.extractRawText() |
| .pdf | 服务端 API | POST /api/parse-pdf，用 pdf-parse 库 |

文件大小限制 5MB。解析失败时显示友好错误提示。

---

## 十、后续扩展（不需要现在实现）

| 优先级 | 功能 | 改动量 |
|--------|------|--------|
| P1 | 生成历史列表 + 查看 | 加页面，读 generations 表 |
| P1 | 导出 Word（存到腾讯云 COS）| 用 docx 库，加 /api/export，文件存 COS |
| P2 | 手机号登录 | 接阿里云/腾讯云短信 + MemFire Auth |
| P2 | 微信登录 | MemFire Cloud 原生支持，改动很小 |
| P2 | 领导风格画像 | 批量上传 → 聚合分析 → 可视化 |
| P3 | 新材料类型（工作总结） | 插入一条 style_rules + 新 prompt 模板，全局词汇自动继承 |
| P3 | 新材料类型（领导讲话稿）| 同上，rules 里加 allow_first_person: true |
| P3 | 科室共享风格库 | user_global_phrases 加 team_id + 合并逻辑 |

**新增材料类型的具体步骤（以"工作总结"为例）：**
1. 在 defaults.ts 里新增一套默认 rules + subtitle_styles + type_phrases
2. 新增一套提取要点 Prompt（工作总结的要点字段不同于宣传稿）
3. 新增一套生成全文 Prompt（结构、语气、禁忌不同）
4. 前端加一个材料类型选择器（写稿页顶部 tab 或下拉）
5. 全局词汇库零改动，自动可用
