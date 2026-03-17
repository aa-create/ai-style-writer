# 写稿页面改版：从表单流程改为对话式

---

## 概述

把写稿页面从"表单 → 提取要点 → 确认 → 生成"的固定流程，改为一个纯对话界面。
用户随便说话，AI 直接生成文稿。不满意就继续对话微调，满意为止。
风格库（风格摘要 + 范例片段）在 system prompt 中静默注入，用户无感。

---

## 删除的东西

1. 删除 /api/extract 路由（整个文件删掉）
2. 删除 ExtractedPoints.tsx 组件
3. 删除写稿页面中所有和"提取要点""确认卡片""小标题风格选择"相关的代码

---

## 新的 /app/write/page.tsx

改为聊天界面，结构如下：

```
┌──────────────────────────────────────────┐
│  顶部                                     │
│  页面标题 + 右上角"保存到历史"按钮         │
│  （+ "新对话"按钮，清空当前对话开始新的）  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  对话区域（可滚动）                        │
│                                          │
│  [用户消息气泡]                           │
│  上周社区搞了个反诈宣传…                  │
│  📎 活动记录.docx                        │
│                                          │
│  [AI 消息气泡]                            │
│  XX街道联合XX派出所扎实推进…              │
│  （流式输出，带复制按钮）                  │
│                                          │
│  [用户消息气泡]                           │
│  标题改短一点，第二段加点数据              │
│                                          │
│  [AI 消息气泡]                            │
│  （修改后的完整文稿）                      │
│                                          │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ [📎]  输入你想写的内容…          [发送]   │
└──────────────────────────────────────────┘
```

### 前端状态管理

```typescript
// 对话历史，前端维护
const [messages, setMessages] = useState<{
  role: 'user' | 'assistant';
  content: string;
}[]>([]);

// 当前输入
const [input, setInput] = useState('');

// 附件（解析后的文本）
const [attachmentText, setAttachmentText] = useState('');

// 是否正在生成
const [isStreaming, setIsStreaming] = useState(false);
```

### 交互逻辑

1. 用户在输入框打字 + 可选上传附件
2. 点发送（或 Ctrl+Enter）：
   - 如果有附件文本，拼到用户消息后面
   - 把用户消息追加到 messages 数组
   - 调用 POST /api/generate（传完整 messages 数组）
   - AI 回复流式追加到界面
   - 流式结束后把 AI 回复追加到 messages 数组
3. 用户继续输入修改意见 → 重复步骤 2
4. 用户满意后点"保存到历史" → 存入 generations 表
5. 点"新对话" → 清空 messages 数组

### AI 消息气泡的功能

- 流式输出时显示逐字打出的效果
- 输出完成后显示"复制"按钮
- 最新一条 AI 回复额外显示"保存到历史"按钮

### 输入区

- 一个 textarea，placeholder："把你想写的内容随便说说，或者告诉我怎么修改…"
- 左侧 📎 按钮上传附件（.txt .md .docx .pdf）
- 上传后在输入框上方显示文件名 tag，可点 x 移除
- 右侧发送按钮
- 支持 Ctrl+Enter 发送
- 正在生成时，发送按钮变为"停止"按钮

---

## 修改 /api/generate 路由

从单次生成改为多轮对话。

### 请求格式变更

```typescript
// 原来
{ points: object, subtitleStyle: string }

// 改为
{ messages: { role: 'user' | 'assistant', content: string }[] }
```

### 后端逻辑

```
1. 接收前端传来的 messages 数组（完整对话历史）
2. 通过 style-service.ts 读取当前用户的风格数据：
   - style_rules.style_summary（风格摘要）
   - style_rules.example_paragraphs（范例片段）
   - 如果 style_summary 为空（新用户），则读取完整词汇列表作为 fallback
3. 拼装 system prompt
4. 调用 AI：system prompt + messages 数组，streaming 模式
5. 流式返回
```

### 新的 system prompt

```
你是一位资深的体制内宣传文稿写作专家。

【写作规范】
- 标题不超过30字
- 结构：导语段 + 3-4段正文
- 每段结构：小标题→展开句→举例句→成效句
- 每段不超过200字
- 小标题风格请根据内容自行选择最合适的格式

【你的写作风格指南】
{style_summary，如果为空则用以下 fallback：}
{fallback: 直接列出词汇库内容，格式为"常用词汇：xxx/xxx/xxx"}

【风格范例（模仿这种语感）】
{example_paragraphs，每段一个，如果为空则跳过整个部分}

【工作方式】
- 用户第一次发消息时，根据内容直接生成完整的宣传文稿
- 用户后续发消息是修改意见，根据意见修改文稿并输出修改后的完整版本
- 信息不足的地方用【待补充：xxx】标注
- 不捏造数据/人名/地名，不用第一人称，不口语化，不超出用户事实范围
```

注意新增了【工作方式】部分，告诉 AI 第一轮是生成、后续轮是修改。

---

## 新增"保存到历史"逻辑

不再是生成完自动保存，改为用户手动触发：

```
POST /api/history

请求：
{
  messages: [...],        // 完整对话历史
  finalOutput: string     // 最后一条 AI 回复（最终稿）
}

后端：
1. 存入 generations 表：
   - raw_input: messages[0].content（用户第一条消息）
   - output: finalOutput（最终稿）
   - material_type: 'propaganda'
   - extracted_points: null（不再使用）
   - style_used: null（不再指定）
2. 返回 { id: generationId }
```

---

## 新增"新对话"按钮

点击后：
- 弹出确认："当前对话尚未保存，确定开始新对话吗？"（如果有未保存的对话）
- 确认后清空 messages 数组
- 清空输入框和附件

---

## 对话上下文优化（控制 token 消耗）

当 messages 数组超过 8 轮（16 条消息）时，自动截断：
- 保留第 1 条用户消息（原始需求）
- 保留最后 6 轮对话（12 条消息）
- 中间的丢弃

这样即使对话很长，token 消耗也有上限。

在 prompt-builder.ts 中实现：

```typescript
function trimMessages(messages: Message[]): Message[] {
  if (messages.length <= 16) return messages;
  return [
    messages[0],  // 保留第一条（原始需求）
    ...messages.slice(-12)  // 保留最后 6 轮
  ];
}
```

---

## 不需要改的部分

- /api/analyze — 不变
- /api/learn — 不变
- /api/style — 不变
- /app/train — 不变
- 风格库相关逻辑 — 不变
- 登录/中间件 — 不变
- ai/client.ts — 已支持 streaming，不需要改
- 文件解析逻辑 — 不变

---

## UI 风格要求

- 对话气泡：用户靠右（浅灰背景），AI 靠左（白色背景）
- AI 回复中如果包含标题（第一行），加粗显示
- 代码风格参考主流 AI 对话产品（ChatGPT / Kimi 的对话样式）
- 保持最大宽度 800px 居中
- 对话区域自动滚动到底部
- 移动端友好：输入框固定在底部
