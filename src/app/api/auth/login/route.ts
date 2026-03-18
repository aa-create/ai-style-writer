import { NextResponse } from "next/server";
import { setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import pool from "@/lib/db";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "请填写邮箱和密码。" }, { status: 400 });
    }

    const result = await pool.query(
      "select id, email, password_hash from users where email = $1 limit 1",
      [email],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "邮箱或密码错误。" }, { status: 401 });
    }

    const user = result.rows[0] as { id: string; email: string; password_hash: string };
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "邮箱或密码错误。" }, { status: 401 });
    }

    const token = signToken(user.id, user.email);
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.headers.set("Set-Cookie", setAuthCookie(token));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
