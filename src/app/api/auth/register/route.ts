import { NextResponse } from "next/server";
import { hashPassword, setAuthCookie, signToken } from "@/lib/auth";
import pool from "@/lib/db";

type RegisterBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "请填写邮箱和密码。" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位。" }, { status: 400 });
    }

    const existing = await pool.query("select id from users where email = $1 limit 1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "该邮箱已注册。" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      "insert into users (email, password_hash) values ($1, $2) returning id, email",
      [email, passwordHash],
    );
    const user = result.rows[0] as { id: string; email: string };
    const token = signToken(user.id, user.email);

    const response = NextResponse.json({ user });
    response.headers.set("Set-Cookie", setAuthCookie(token));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
