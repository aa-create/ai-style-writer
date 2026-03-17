import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addCustomPhrase,
  deleteExampleParagraph,
  deleteSubtitleStyle,
  generateStyleSummaryForUser,
  getStyleLibrarySnapshot,
  removeCustomPhrase,
  removeSpecialExpression,
} from "@/lib/style-service";

type PatchBody =
  | { action: "add_custom_phrase"; phrase: string; materialType?: string }
  | { action: "remove_custom_phrase"; phrase: string; materialType?: string }
  | { action: "remove_special_expression"; expression: string; materialType?: string }
  | { action: "delete_subtitle_style"; name: string; materialType?: string }
  | { action: "delete_example_paragraph"; paragraph: string; materialType?: string }
  | { action: "regenerate_summary"; materialType?: string };

async function getUserId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录。");
  return user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const materialType = searchParams.get("materialType") ?? "propaganda";
    return NextResponse.json(await getStyleLibrarySnapshot(userId, materialType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取风格库失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    const body = (await request.json()) as PatchBody;
    const materialType = body.materialType ?? "propaganda";

    switch (body.action) {
      case "add_custom_phrase":
        if (!body.phrase.trim()) return NextResponse.json({ error: "词汇不能为空。" }, { status: 400 });
        await addCustomPhrase(userId, body.phrase.trim());
        break;
      case "remove_custom_phrase":
        await removeCustomPhrase(userId, body.phrase.trim());
        break;
      case "remove_special_expression":
        await removeSpecialExpression(userId, body.expression.trim());
        break;
      case "delete_subtitle_style":
        await deleteSubtitleStyle(userId, materialType, body.name);
        break;
      case "delete_example_paragraph":
        await deleteExampleParagraph(userId, materialType, body.paragraph);
        break;
      case "regenerate_summary":
        await generateStyleSummaryForUser(userId, materialType);
        break;
    }

    return NextResponse.json(await getStyleLibrarySnapshot(userId, materialType));
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新风格库失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

