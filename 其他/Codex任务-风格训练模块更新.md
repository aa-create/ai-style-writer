# 风格训练模块更新任务

> 以下是需要修改的内容，请按顺序执行。所有修改必须通过 style-service.ts 操作数据库。

---

## 任务 1：更新数据库表结构

在 Supabase SQL 编辑器中执行以下变更（或在代码中适配新结构）：

### style_rules 表增加字段

现有的 style_rules 表的 jsonb 字段需要扩展，支持存储更多维度。
不需要改表结构（还是 jsonb），只需要改代码中读写这些字段的逻辑。

style_rules 的完整 JSON 结构变为：

```json
{
  "material_type": "propaganda",
  "rules": {
    "title_max_length": 30,
    "title_pattern": "【单位】+【动作】+【目标】",
    "body_paragraphs": "3-4段",
    "paragraph_structure": "小标题→展开句→举例句→成效句",
    "max_chars_per_paragraph": 200,
    "title_patterns": [],
    "intro_templates": [],
    "paragraph_patterns": []
  },
  "type_phrases": {
    "自定义": []
  },
  "subtitle_styles": [
    { "name": "字诀式", "pattern": "以\"X\"字+动词短语", "example": "..." },
    { "name": "动宾式", "pattern": "动词+宾语+补充", "example": "..." },
    { "name": "聚焦式", "pattern": "聚焦/依托+名词+动词", "example": "..." }
  ],
  "style_summary": "",
  "example_paragraphs": [],
  "stats": { "learned_count": 0 }
}
```

新增的字段说明：
- rules.title_patterns: string[] — 从范文学到的标题结构模板
- rules.intro_templates: string[] — 从范文学到的导语句式模板
- rules.paragraph_patterns: string[] — 从范文学到的段落展开模式
- style_summary: string — AI 压缩生成的风格摘要（300-500字），生成时直接塞进 prompt
- example_paragraphs: string[] — 从范文中挑选的 2-3 段最有代表性的段落原文（每段≤100字）

### user_global_phrases 表增加字段

phrases 的 JSON 结构增加一个分类：

```json
{
  "phrases": {
    "政治": [...],
    "举措": [...],
    "成效": [...],
    "自定义": [],
    "特殊表达": []
  }
}
```

新增 "特殊表达" 分类，存储从范文中学到的非四字词的特色表达（如"打通最后一公里""以案促改"）。

---

## 任务 2：更新 defaults.ts

更新默认数据，新增字段的初始值：

```typescript
// style_rules 默认值新增
rules: {
  ...原有字段,
  title_patterns: [],      // 学习后会积累
  intro_templates: [],     // 学习后会积累
  paragraph_patterns: [],  // 学习后会积累
},
style_summary: "",          // 学习后由 AI 生成
example_paragraphs: [],     // 学习后由 AI 挑选

// user_global_phrases 默认值新增
phrases: {
  ...原有分类,
  "特殊表达": []             // 学习后会积累
}
```

---

## 任务 3：更新分析范文的 Prompt（/api/analyze）

修改 POST /api/analyze 的 system prompt，让 AI 同时返回范例片段：

```
System:
你是公文写作分析专家。分析范文的写作特征，返回纯 JSON（不要代码块标记）：
{
  "title_pattern": "标题结构规律（一句话描述）",
  "intro_style": "导语句式特征（一句话描述）",
  "subtitle_format": {
    "name": "格式名称",
    "pattern": "格式描述",
    "example": "从范文中摘取的一个小标题原文"
  },
  "four_char_phrases": ["提取到的四字词1", "四字词2"],
  "special_expressions": ["非四字词的特色表达1", "表达2"],
  "paragraph_style": "段落展开方式（一句话描述）",
  "best_paragraph": "从范文中选一段最能代表其写作风格的段落原文（100字以内）"
}

User:
{范文全文}
```

注意 subtitle_format 从字符串改为对象（包含 name/pattern/example），方便代码直接追加到 subtitle_styles 数组。
新增 best_paragraph 字段，用于积累范例片段。

---

## 任务 4：更新学习写入逻辑（/api/learn）

这是最关键的改动。原来是把分析结果的词汇写入数据库，现在改为全维度代码 merge。

/api/learn 的新逻辑：

```
1. 接收前端传来的 analysis JSON 和 materialType

2. 读取当前用户的 user_global_phrases

3. 词汇 merge（代码做，不调 AI）：
   - analysis.four_char_phrases → 遍历所有已有分类，不存在的追加到 "自定义"
   - analysis.special_expressions → 追加到 "特殊表达"，去重

4. 更新 user_global_phrases

5. 读取当前用户的 style_rules

6. 结构 merge（代码做，不调 AI）：
   - analysis.subtitle_format → 检查 subtitle_styles 数组里有没有同名的，没有则追加
   - analysis.title_pattern → 检查 rules.title_patterns 数组里有没有相同的，没有则追加（上限 5 条）
   - analysis.intro_style → 检查 rules.intro_templates 数组里有没有相同的，没有则追加（上限 5 条）
   - analysis.paragraph_style → 检查 rules.paragraph_patterns 数组里有没有相同的，没有则追加（上限 5 条）
   - analysis.best_paragraph → 追加到 example_paragraphs 数组（上限保留最新 3 段，超过则移除最早的）

7. 更新 stats.learned_count + 1

8. 检查 learned_count % 5 === 0，如果是，触发风格摘要生成（见任务 5）

9. 更新 style_rules

10. 存一条 learned_articles 记录

11. 返回 { newPhraseCount, newExpressionsCount, newPatternsCount, summaryUpdated }
```

去重逻辑说明：
- 四字词和特殊表达：精确匹配去重（字符串完全相同则跳过）
- 标题/导语/段落模式：因为是自然语言描述，无法精确去重，所以简单判断：如果新的描述和已有的某条长度差异<20%且前10个字相同，视为重复跳过。否则追加。

---

## 任务 5：新增风格摘要生成 API

新增 POST /api/generate-summary 路由（也可以作为 /api/learn 内部的一个函数）：

在 learned_count 是 5 的倍数时自动触发，也可以手动触发。

```
逻辑：
1. 读取当前用户的 user_global_phrases + style_rules 完整数据
2. 调用 AI，生成压缩后的风格摘要

Prompt:
System:
你是写作风格总结专家。请将以下风格库数据压缩为一份简洁的"写作风格指南"，
300-500字，直接可以作为写作指令使用。包含以下部分：
- 标题常用结构
- 导语习惯
- 小标题偏好（列出可用的格式和示例）
- 常用词汇（每类列出最常用的 10-15 个，用 / 分隔）
- 特色表达
- 段落展开方式
不要输出 JSON，直接输出纯文本的风格指南。

User:
{完整的 user_global_phrases JSON + style_rules JSON}

3. 将 AI 返回的文本存入 style_rules.style_summary
4. 返回 { summaryUpdated: true }
```

---

## 任务 6：更新生成全文的 Prompt（/api/generate）

修改 prompt-builder.ts，生成时不再塞完整的风格库 JSON，改为使用风格摘要 + 范例片段。

新的 system prompt 结构：

```
你是一位资深的体制内宣传文稿写作专家。

【写作规范】
- 标题不超过{rules.title_max_length}字
- 结构：导语段 + {rules.body_paragraphs}段正文
- 每段结构：{rules.paragraph_structure}
- 每段不超过{rules.max_chars_per_paragraph}字

【本次小标题风格：{选中的风格名}】
格式：{pattern}
示例：{example}

【你的写作风格指南】
{style_summary 的内容，如果为空则用默认的词汇列表代替}

【风格范例（模仿这种语感）】
{example_paragraphs 数组，每段一个，如果为空则跳过这个部分}

【禁止事项】
不捏造数据/人名/地名，不用第一人称，不口语化，不超出用户事实范围。
信息不足的地方用【待补充：xxx】标注。
```

注意：
- 如果 style_summary 为空（新用户还没学过范文），就用原来的方式把默认词汇直接列出来
- 如果 example_paragraphs 为空，直接跳过"风格范例"部分
- 这样新用户体验不变，学过范文的用户体验更好

---

## 任务 7：更新风格训练页面前端（/app/train）

### 分析结果展示

原来是六张卡片，现在调整为：

1. **标题结构** — 显示 analysis.title_pattern
2. **导语句式** — 显示 analysis.intro_style  
3. **小标题格式** — 显示 analysis.subtitle_format.name + pattern + example
4. **词汇** — 显示 analysis.four_char_phrases，标注新旧（绿色/灰色）
5. **特殊表达** — 显示 analysis.special_expressions，标注新旧（绿色/灰色）
6. **段落结构** — 显示 analysis.paragraph_style
7. **风格范例** — 显示 analysis.best_paragraph，带引用样式

确认学习后的 toast 改为：
"已学习！新增 N 个词汇、N 个表达、N 个模板"

### 风格库展示（下半部分）

增加展示内容：

1. **词汇库** — 原有的 tag 展示（政治/举措/成效/自定义）
2. **特殊表达** — 新增一行 tag 展示，可删除（和自定义词汇一样的交互）
3. **小标题模板** — 列表展示所有模板（内置 3 个 + 学到的），学到的可删除
4. **风格摘要** — 如果 style_summary 不为空，展示为一段文本，带"重新生成"按钮
5. **风格范例** — 显示 example_paragraphs 列表，可删除单条
6. **已学范文** — 原有的列表
7. **统计** — "已学 N 篇 · 词汇 N 个 · 表达 N 个 · 模板 N 种"

---

## 变更不涉及的部分（不需要改）

- 登录逻辑 — 不变
- 提取要点（/api/extract）— 不变
- 数据库表结构 — 不需要新增表，只是 jsonb 内容变了
- 文件解析逻辑 — 不变
- AI 调用封装（ai/client.ts）— 不变
- middleware — 不变
