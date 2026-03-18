import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai/client";
import { getCurrentUserId } from "@/lib/auth";

const analyzePrompt = `你是公文写作分析专家。分析范文的写作特征，返回纯 JSON（不要代码块标记）：
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
}`;

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function tryParseJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as Record<string, unknown>) : null;
  }
}

function normalizeSubtitleFormat(value: unknown) {
  if (!value || typeof value !== "object") {
    return { name: "未识别", pattern: "待补充", example: "" };
  }
  const item = value as Record<string, unknown>;
  return {
    name: typeof item.name === "string" ? item.name.trim() : "未识别",
    pattern: typeof item.pattern === "string" ? item.pattern.trim() : "待补充",
    example: typeof item.example === "string" ? item.example.trim() : "",
  };
}

function buildFallback(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return {
    title_pattern: compact.slice(0, 18) || "待人工补充",
    intro_style: "导语整体较完整，建议人工复核句式特点。",
    subtitle_format: { name: "未识别", pattern: "待补充", example: "" },
    four_char_phrases: [],
    special_expressions: [],
    paragraph_style: "段落层层展开，建议结合原文人工确认。",
    best_paragraph: compact.slice(0, 100),
    fallback: true,
  };
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    const { text } = (await request.json()) as { text?: string };
    if (!text?.trim()) return NextResponse.json({ error: "请先输入范文内容。" }, { status: 400 });

    const result = await callAI([
      { role: "system", content: analyzePrompt },
      { role: "user", content: text.trim() },
    ], { temperature: 0.3 });

    const parsed = tryParseJson(result);
    if (!parsed) return NextResponse.json(buildFallback(text.trim()));

    return NextResponse.json({
      title_pattern: typeof parsed.title_pattern === "string" ? parsed.title_pattern.trim() : "",
      intro_style: typeof parsed.intro_style === "string" ? parsed.intro_style.trim() : "",
      subtitle_format: normalizeSubtitleFormat(parsed.subtitle_format),
      four_char_phrases: toStringArray(parsed.four_char_phrases),
      special_expressions: toStringArray(parsed.special_expressions),
      paragraph_style: typeof parsed.paragraph_style === "string" ? parsed.paragraph_style.trim() : "",
      best_paragraph: typeof parsed.best_paragraph === "string" ? parsed.best_paragraph.trim() : "",
      fallback: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析范文失败。";
    return NextResponse.json({ error: `分析范文失败，请重试。${message ? ` ${message}` : ""}` }, { status: 500 });
  }
}
