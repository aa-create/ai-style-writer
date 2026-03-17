import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStyleSummaryForUser } from "@/lib/style-service";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    const { materialType } = (await request.json().catch(() => ({}))) as { materialType?: string };
    await generateStyleSummaryForUser(user.id, materialType ?? "propaganda");
    return NextResponse.json({ summaryUpdated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成风格摘要失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
