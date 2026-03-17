import { type MaterialStyleRules, type PhraseMap } from "@/lib/defaults";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function joinPhrases(values: string[] | undefined) {
  return values && values.length > 0 ? values.join("/") : "无";
}

function buildFallbackPhraseGuide(phrases: PhraseMap) {
  const joined = [
    ...(phrases["政治"] ?? []),
    ...(phrases["举措"] ?? []),
    ...(phrases["成效"] ?? []),
    ...(phrases["自定义"] ?? []),
    ...(phrases["特殊表达"] ?? []),
  ];
  return `常用词汇：${joinPhrases(joined)}`;
}

function buildExampleParagraphs(paragraphs: string[]) {
  if (!paragraphs.length) {
    return "";
  }

  return ["", "【风格范例（模仿这种语感）】", ...paragraphs.map((item) => `- ${item}`)].join("\n");
}

export function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 16) return messages;
  return [messages[0], ...messages.slice(-12)];
}

export function buildConversationSystemPrompt(
  styleData: MaterialStyleRules,
  mergedPhrases: PhraseMap,
) {
  const styleGuide = styleData.style_summary.trim() || buildFallbackPhraseGuide(mergedPhrases);
  const exampleParagraphs = buildExampleParagraphs(styleData.example_paragraphs);

  return `你是一位资深的体制内宣传文稿写作专家。

【写作规范】
- 标题不超过30字
- 结构：导语段 + 3-4段正文
- 每段结构：小标题→展开句→举例句→成效句
- 每段不超过200字
- 小标题风格请根据内容自行选择最合适的格式

【你的写作风格指南】
${styleGuide}${exampleParagraphs}

【工作方式】
- 用户第一次发消息时，根据内容直接生成完整的宣传文稿
- 用户后续发消息是修改意见，根据意见修改文稿并输出修改后的完整版本
- 信息不足的地方用【待补充：xxx】标注
- 不捏造数据/人名/地名，不用第一人称，不口语化，不超出用户事实范围`;
}
