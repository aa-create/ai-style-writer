import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET() {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const result = await pool.query(
      "select id, email, display_name from users where id = $1 limit 1",
      [userId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取当前用户失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
