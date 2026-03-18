import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { saveGenerationHistory } from "@/lib/style-service";
import type { ChatMessage } from "@/lib/prompt-builder";

type HistoryBody = {
  messages?: ChatMessage[];
  finalOutput?: string;
  materialType?: string;
};

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const body = (await request.json()) as HistoryBody;
    const finalOutput = body.finalOutput?.trim() ?? "";
    const messages = body.messages ?? [];
    const firstUserMessage = messages.find((item) => item.role === "user")?.content?.trim() ?? "";

    if (!firstUserMessage || !finalOutput) {
      return NextResponse.json({ error: "缺少保存历史所需内容。" }, { status: 400 });
    }

    await saveGenerationHistory(userId, body.materialType ?? "propaganda", firstUserMessage, finalOutput);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存历史失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
