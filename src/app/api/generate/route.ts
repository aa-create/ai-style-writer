import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai/client";
import { createAIStreamResponse } from "@/lib/ai/stream";
import { getCurrentUserId } from "@/lib/auth";
import { buildConversationSystemPrompt, trimMessages, type ChatMessage } from "@/lib/prompt-builder";
import { getMergedPhrases, getOrCreateUserData, getStyleRules } from "@/lib/style-service";

type GenerateRequest = { materialType?: string; messages?: ChatMessage[] };

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    const body = (await request.json()) as GenerateRequest;
    const materialType = body.materialType ?? "propaganda";
    const messages = (body.messages ?? []).filter((item) => item.role && item.content?.trim());
    if (!messages.length) return NextResponse.json({ error: "请先输入对话内容。" }, { status: 400 });

    await getOrCreateUserData(userId);
    const [styleData, mergedPhraseData] = await Promise.all([
      getStyleRules(userId, materialType),
      getMergedPhrases(userId, materialType),
    ]);
    const systemPrompt = buildConversationSystemPrompt(styleData, mergedPhraseData.phrases);
    const stream = await callAI(
      [{ role: "system", content: systemPrompt }, ...trimMessages(messages)],
      { stream: true, temperature: 0.7 },
    );

    return createAIStreamResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
