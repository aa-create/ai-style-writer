import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { learnFromAnalysis } from "@/lib/style-service";
import type { SubtitleStyle } from "@/lib/defaults";

type LearnBody = {
  content?: string;
  materialType?: string;
  analysis?: {
    title_pattern: string;
    intro_style: string;
    subtitle_format?: SubtitleStyle | null;
    four_char_phrases: string[];
    special_expressions: string[];
    paragraph_style: string;
    best_paragraph: string;
  };
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    const body = (await request.json()) as LearnBody;
    const materialType = body.materialType ?? "propaganda";
    const content = body.content?.trim() ?? "";
    if (!content || !body.analysis) return NextResponse.json({ error: "缺少学习所需内容。" }, { status: 400 });

    const result = await learnFromAnalysis(user.id, materialType, content, body.analysis);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "学习范文失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
