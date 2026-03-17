"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace("/app");
        }
      } catch (sessionError) {
        const message =
          sessionError instanceof Error
            ? sessionError.message
            : "Supabase 配置异常，请检查 .env.local。";

        setError(message);
      }
    }

    void checkSession();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const signInResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!signInResult.error) {
        router.replace("/app");
        router.refresh();
        setIsLoading(false);
        return;
      }

      const signUpResult = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpResult.error) {
        setError(signInResult.error.message || signUpResult.error.message);
        setIsLoading(false);
        return;
      }

      if (signUpResult.data.session) {
        router.replace("/app");
        router.refresh();
        setIsLoading(false);
        return;
      }

      const retrySignInResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (retrySignInResult.error) {
        setError(retrySignInResult.error.message);
        setIsLoading(false);
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "登录失败，请稍后重试。";

      setError(message);
    }

    setIsLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">邮箱登录</h1>
          <p className="text-sm text-slate-500">
            首次使用会自动注册，成功后进入写稿工作台。
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "提交中..." : "登录 / 注册"}
          </button>
        </form>
      </div>
    </main>
  );
}
