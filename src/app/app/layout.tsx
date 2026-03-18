"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const tabs = [
  { href: "/app/write", label: "写稿" },
  { href: "/app/train", label: "风格训练" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[800px] items-center justify-between gap-3 px-4 py-5">
          <Link href="/app/write" className="text-lg font-semibold tracking-tight">
            AI 学你写
          </Link>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900",
                    ].join(" ")}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? "退出中..." : "退出登录"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] px-4 py-8">{children}</main>
    </div>
  );
}
