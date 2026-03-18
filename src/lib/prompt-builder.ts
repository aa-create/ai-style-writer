import { type MaterialStyleRules, type PhraseMap } from "@/lib/defaults";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const WRITE_PROMPT_TEMPLATE = `你是一位资深的体制内宣传文稿写作专家，通过对话帮助用户完成文稿写作。

===== 写作规范 =====

- 标题不超过30字
- 结构：导语段 + 3-4段正文
- 每段结构：小标题→展开句→举例句→成效句
- 每段不超过200字
- 小标题风格根据内容自行选择最合适的格式

===== 你的写作风格指南 =====

{style_summary}{fallback_style_summary}{example_section}===== 工作方式 =====

【第一轮：生成初稿】
- 如果用户提供的信息足够（包含主题、参与方、举措等），直接生成完整文稿
- 如果用户提供的信息太少（比如只有一句话），先向用户提问 2-3 个关键问题，例如：
  "为了帮你写出更贴合实际的文稿，请补充以下信息：
   1. 活动的具体时间和地点？
   2. 主要参与的单位或人员？
   3. 取得了哪些成效或数据？"
  等用户回复后再生成初稿

【后续轮：修改文稿】
- 根据用户的修改意见，输出修改后的完整文稿
- 用 >>>修改：和 <<< 标记包裹本次改动的部分，方便用户识别改了哪里
- 示例：
  一、以"防"字当头 筑牢反诈防线
  >>>修改：该街道联合XX派出所，在辖区菜市场、社区广场等人流密集场所设立宣传点位8个，累计发放宣传资料500余份。<<<
  （未改动的段落正常输出，不加标记）

【结束信号】
- 当用户表达满意（如"可以了""不错""就这样"等），不要再修改，直接回复：
  "好的，最终稿已完成。你可以点击复制或保存到历史。如需进一步调整，随时告诉我。"

===== 红线规则 =====

1. 不得捏造数据、人名、地名，信息不足的地方用【待补充：XXX】标注
2. 不使用第一人称
3. 不口语化
4. 不超出用户提供的事实范围
5. 如果你认为需要添加用户未提到的具体举措来丰富文稿，必须先征求用户同意：
   "为了让文稿更充实，我建议增加以下内容，你看是否合适？
    · XXX
    · XXX
   如果可以，我会加入文稿中。"
6. 优先使用风格指南中的词汇和表达方式
`;

function joinPhrases(values: string[] | undefined) {
  return values && values.length > 0 ? values.join("/") : "无";
}

function buildFallbackPhraseGuide(phrases: PhraseMap) {
  const sections = [
    { label: "举措类", values: phrases["举措"] },
    { label: "成效类", values: phrases["成效"] },
    { label: "政治类", values: phrases["政治"] },
    { label: "自定义", values: phrases["自定义"] },
    { label: "特殊表达", values: phrases["特殊表达"] },
  ].filter((item) => item.values && item.values.length > 0);

  if (!sections.length) {
    return "常用词汇：无\n\n";
  }

  return ["常用词汇：", ...sections.map((item) => `${item.label}：${joinPhrases(item.values)}`), "", ""].join("\n");
}

function buildExampleParagraphs(paragraphs: string[]) {
  const normalized = paragraphs.map((item) => item.trim()).filter(Boolean);
  if (!normalized.length) {
    return "";
  }

  return [
    "===== 风格范例（模仿这种语感）=====",
    "",
    ...normalized,
    "",
    "",
  ].join("\n");
}

export function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 16) return messages;
  return [messages[0], ...messages.slice(-12)];
}

export function buildConversationSystemPrompt(
  styleData: MaterialStyleRules,
  mergedPhrases: PhraseMap,
) {
  const styleSummary = styleData.style_summary.trim();
  const exampleParagraphs = buildExampleParagraphs(styleData.example_paragraphs);
  const resolvedStyleSummary = styleSummary ? `${styleSummary}\n\n` : "";

  return WRITE_PROMPT_TEMPLATE
    .replace("{style_summary}", resolvedStyleSummary)
    .replace("{fallback_style_summary}", styleSummary ? "" : buildFallbackPhraseGuide(mergedPhrases))
    .replace("{example_section}", exampleParagraphs);
}
