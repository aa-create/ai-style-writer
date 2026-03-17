import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const features = ["学习你的风格", "两步确认生成", "风格库越积越厚"];

export default async function Home() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/app/write");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f4ed,white_48%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[85vh] max-w-[800px] flex-col justify-center rounded-[36px] border border-stone-200 bg-white/90 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-12">
        <div className="inline-flex w-fit rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600">宣传稿智能写作</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">AI 学你写</h1>
        <p className="mt-3 text-xl text-stone-700">越用越懂你的写作风格</p>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-500">上传范文，沉淀词汇和表达习惯；写稿时先确认要点，再流式生成完整文稿，让输出越来越像你。</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((feature, index) => (
            <div key={feature} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm text-stone-400">0{index + 1}</p>
              <p className="mt-4 text-base font-medium text-slate-900">{feature}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto">立即登录</Link>
          <Link href="/app/write" className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 sm:w-auto">查看工作台</Link>
        </div>
      </div>
    </main>
  );
}
