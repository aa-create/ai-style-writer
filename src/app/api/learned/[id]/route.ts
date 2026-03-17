import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteLearnedArticle, getStyleLibrarySnapshot } from "@/lib/style-service";

export async function DELETE(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    await deleteLearnedArticle(user.id, context.params.id);
    const snapshot = await getStyleLibrarySnapshot(user.id, "propaganda");
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除已学范文失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
