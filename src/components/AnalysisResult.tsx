"use client";

import type { SubtitleStyle } from "@/lib/defaults";

type AnalysisData = {
  title_pattern: string;
  intro_style: string;
  subtitle_format: SubtitleStyle;
  four_char_phrases: string[];
  special_expressions: string[];
  paragraph_style: string;
  best_paragraph: string;
};

type AnalysisResultProps = {
  analysis: AnalysisData;
  existingPhrases: string[];
  existingExpressions: string[];
  onCancel: () => void;
  onConfirm: () => void;
  isLearning: boolean;
};

function renderTags(values: string[], exists: string[]) {
  if (!values.length) return <span className="text-sm text-slate-400">暂无</span>;
  return values.map((item) => {
    const isOld = exists.includes(item);
    return (
      <span key={item} className={[
        "rounded-full px-3 py-1 text-xs font-medium",
        isOld ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700",
      ].join(" ")}>
        {item}
      </span>
    );
  });
}

export function AnalysisResult({ analysis, existingPhrases, existingExpressions, onCancel, onConfirm, isLearning }: AnalysisResultProps) {
  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">分析结果</h2>
        <p className="mt-1 text-sm text-slate-500">确认后会把新词汇、表达和模板写入你的风格库。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">标题结构</p><p className="mt-3 text-sm leading-7 text-slate-800">{analysis.title_pattern || "暂无"}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">导语句式</p><p className="mt-3 text-sm leading-7 text-slate-800">{analysis.intro_style || "暂无"}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">小标题格式</p><p className="mt-3 text-sm leading-7 text-slate-800">{analysis.subtitle_format.name}</p><p className="mt-2 text-xs text-slate-500">{analysis.subtitle_format.pattern}</p><p className="mt-2 text-xs text-slate-600">例：{analysis.subtitle_format.example || "暂无"}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">词汇</p><div className="mt-3 flex flex-wrap gap-2">{renderTags(analysis.four_char_phrases, existingPhrases)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">特殊表达</p><div className="mt-3 flex flex-wrap gap-2">{renderTags(analysis.special_expressions, existingExpressions)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-500">段落结构</p><p className="mt-3 text-sm leading-7 text-slate-800">{analysis.paragraph_style || "暂无"}</p></div>
      </div>

      <blockquote className="rounded-2xl border-l-4 border-slate-900 bg-stone-50 px-4 py-4 text-sm leading-7 text-slate-700">
        {analysis.best_paragraph || "暂无可用范例"}
      </blockquote>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onCancel} disabled={isLearning} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-60">放弃</button>
        <button type="button" onClick={onConfirm} disabled={isLearning} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400">{isLearning ? "学习中..." : "确认学习"}</button>
      </div>
    </div>
  );
}
