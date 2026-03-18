import "server-only";

import bcrypt from "bcryptjs";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const TOKEN_NAME = "auth_token";
const MAX_AGE = 7 * 24 * 60 * 60;

type AuthPayload = {
  userId: string;
  email: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("缺少 AUTH_SECRET 环境变量，请检查 .env.local 配置。");
  }

  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const token = cookies().get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

export function setAuthCookie(token: string) {
  return serialize(TOKEN_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAuthCookie() {
  return serialize(TOKEN_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}
