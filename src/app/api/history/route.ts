import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveGenerationHistory } from "@/lib/style-service";
import type { ChatMessage } from "@/lib/prompt-builder";

type HistoryBody = {
  messages?: ChatMessage[];
  finalOutput?: string;
  materialType?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "????" }, { status: 401 });
    }

    const body = (await request.json()) as HistoryBody;
    const finalOutput = body.finalOutput?.trim() ?? "";
    const messages = body.messages ?? [];
    const firstUserMessage = messages.find((item) => item.role === "user")?.content?.trim() ?? "";

    if (!firstUserMessage || !finalOutput) {
      return NextResponse.json({ error: "???????????" }, { status: 400 });
    }

    await saveGenerationHistory(user.id, body.materialType ?? "propaganda", firstUserMessage, finalOutput);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "???????";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
