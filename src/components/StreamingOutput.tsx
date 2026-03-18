"use client";

import { ArticleText } from "@/components/ArticleText";

type StreamingOutputProps = {
  content: string;
  isGenerating: boolean;
  copied: boolean;
  onCopy: () => void;
};

export function StreamingOutput({
  content,
  isGenerating,
  copied,
  onCopy,
}: StreamingOutputProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">第二步：生成结果</h2>
          <p className="mt-1 text-sm text-slate-500">支持流式预览，生成完成后可直接复制。</p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          disabled={!content.trim()}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>

      <div className="min-h-[320px] rounded-2xl bg-stone-50 p-5">
        {content ? (
          <ArticleText content={content} className="space-y-4 whitespace-pre-wrap break-words font-serif" />
        ) : (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-400">
            {isGenerating ? "AI 正在生成全文，请稍候..." : "确认要点后，这里将显示生成结果。"}
          </div>
        )}
      </div>
    </div>
  );
}
