import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";

const tags = ["专属知识库", "智能对话写作"];

export default function Home() {
  if (getCurrentUserId()) {
    redirect("/app/write");
  }

  return (
    <main className="min-h-screen bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[736px] items-center">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:px-5 sm:py-10">
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_212px] md:gap-0">
            <div>
              <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  智能写作
                </div>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-[2.75rem]">
                AI 学你写
              </h1>
              <p className="mt-3 text-base text-slate-500 sm:text-lg">
                越用越懂你的写作风格
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"
                  >
                    {tag}
                  </div>
                ))}
              </div>

              <div className="mt-7 flex">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  立即登录
                </a>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
                <Image
                  src="/logo.jpg"
                  alt="AI 学你写"
                  width={220}
                  height={220}
                  className="h-[192px] w-[192px] object-cover sm:h-[208px] sm:w-[208px]"
                  priority
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
