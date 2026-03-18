import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteLearnedArticle, getStyleLibrarySnapshot } from "@/lib/style-service";

export async function DELETE(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "未登录。" }, { status: 401 });

    await deleteLearnedArticle(userId, context.params.id);
    const snapshot = await getStyleLibrarySnapshot(userId, "propaganda");
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除已学范文失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
