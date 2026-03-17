import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai/client";
import { createAIStreamResponse } from "@/lib/ai/stream";
import { buildConversationSystemPrompt, trimMessages, type ChatMessage } from "@/lib/prompt-builder";
import { getMergedPhrases, getOrCreateUserData, getStyleRules } from "@/lib/style-service";
import { createClient } from "@/lib/supabase/server";

type GenerateRequest = { materialType?: string; messages?: ChatMessage[] };

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "????" }, { status: 401 });

    const body = (await request.json()) as GenerateRequest;
    const materialType = body.materialType ?? "propaganda";
    const messages = (body.messages ?? []).filter((item) => item.role && item.content?.trim());
    if (!messages.length) return NextResponse.json({ error: "???????" }, { status: 400 });

    await getOrCreateUserData(user.id);
    const [styleData, mergedPhraseData] = await Promise.all([
      getStyleRules(user.id, materialType),
      getMergedPhrases(user.id, materialType),
    ]);
    const systemPrompt = buildConversationSystemPrompt(styleData, mergedPhraseData.phrases);
    const stream = await callAI(
      [{ role: "system", content: systemPrompt }, ...trimMessages(messages)],
      { stream: true, temperature: 0.7 },
    );

    return createAIStreamResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "???????";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
