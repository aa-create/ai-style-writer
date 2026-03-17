
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { FileUpload } from "@/components/FileUpload";
import { parseFile } from "@/lib/file-parser";
import type { MaterialStyleRules, PhraseMap, SubtitleStyle } from "@/lib/defaults";

type LearnedArticle = {
  id: string;
  title: string;
  material_type: string;
  content: string;
  analysis: {
    title_pattern: string;
    intro_style: string;
    subtitle_format: SubtitleStyle;
    four_char_phrases: string[];
    special_expressions: string[];
    paragraph_style: string;
    best_paragraph: string;
  } | null;
  created_at: string;
};

type Snapshot = {
  phrases: PhraseMap;
  learnedArticles: LearnedArticle[];
  styleRules: MaterialStyleRules;
  stats: { learned_count?: number };
  counts: { learnedCount: number; phraseCount: number; expressionCount: number; templateCount: number };
};

type AnalysisData = {
  title_pattern: string;
  intro_style: string;
  subtitle_format: SubtitleStyle;
  four_char_phrases: string[];
  special_expressions: string[];
  paragraph_style: string;
  best_paragraph: string;
};

type TrainWorkspaceProps = { initialSnapshot: Snapshot };
type InputTab = "text" | "file";
type Attachment = { name: string; content: string };

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}

function LoadingBlock() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">分析结果</h2>
      <p className="mt-2 text-sm text-slate-500">正在研读范文……</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function ValueTags({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value) => (
            <span key={`${title}-${value}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">暂无</span>
        )}
      </div>
    </div>
  );
}

function ArticleAnalysis({ article }: { article: LearnedArticle }) {
  if (!article.analysis) {
    return <p className="text-sm text-slate-400">该记录暂无六维分析详情。</p>;
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">标题结构</p><p className="mt-2 text-sm text-slate-700">{article.analysis.title_pattern || "暂无"}</p></div>
        <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">导语句式</p><p className="mt-2 text-sm text-slate-700">{article.analysis.intro_style || "暂无"}</p></div>
        <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">小标题格式</p><p className="mt-2 text-sm text-slate-700">{article.analysis.subtitle_format.name}</p><p className="mt-1 text-xs text-slate-500">{article.analysis.subtitle_format.pattern}</p><p className="mt-1 text-xs text-slate-600">例：{article.analysis.subtitle_format.example || "暂无"}</p></div>
        <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-500">段落结构</p><p className="mt-2 text-sm text-slate-700">{article.analysis.paragraph_style || "暂无"}</p></div>
      </div>
      <ValueTags title="四字词" values={article.analysis.four_char_phrases} />
      <ValueTags title="特殊表达" values={article.analysis.special_expressions} />
      <blockquote className="rounded-2xl border-l-4 border-slate-900 bg-white px-4 py-4 text-sm leading-7 text-slate-700">{article.analysis.best_paragraph || "暂无范例片段"}</blockquote>
    </div>
  );
}

export function TrainWorkspace({ initialSnapshot }: TrainWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [sampleText, setSampleText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [toast, setToast] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [learning, setLearning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  const allExistingPhrases = useMemo(() => Object.values(snapshot.phrases).flat(), [snapshot.phrases]);
  const existingExpressions = snapshot.phrases["特殊表达"] ?? [];
  const [hasLoaded, setHasLoaded] = useState(false);
  const currentText = activeTab === "text" ? sampleText : attachment?.content ?? "";

  useEffect(() => {
    if (hasLoaded) return;
    setHasLoaded(true);
    void refreshSnapshot();
  }, [hasLoaded]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 4000);
  }

  async function refreshSnapshot() {
    setUpdating(true);
    setError("");
    try {
      const response = await fetch("/api/style?materialType=propaganda", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "读取已学记录失败，请重试。");
      setSnapshot(result);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "读取已学记录失败，请重试。");
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpload(files: FileList) {
    setError("");
    try {
      const file = files[0];
      const content = await parseFile(file);
      setAttachment({ name: file.name, content });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件解析失败，请重试。");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      void handleAnalyze();
    }
  }

  async function handleAnalyze() {
    if (!currentText.trim()) {
      setError("请先粘贴范文或上传文件。");
      return;
    }
    setError("");
    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "分析范文失败，请重试。");
      setAnalysis(result);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "分析范文失败，请重试。");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleLearn() {
    if (!analysis || !currentText.trim()) return;
    setLearning(true);
    setError("");
    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentText, materialType: "propaganda", analysis }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "学习范文失败，请重试。");
      setSnapshot(result.snapshot);
      setAnalysis(null);
      const successText = `已学习成功。新增 ${result.newPhraseCount} 个词汇、${result.newExpressionsCount} 个表达、${result.newPatternsCount} 个模板${result.summaryUpdated ? "，并更新了风格摘要" : ""}`;
      showToast(successText);
      showSuccess(successText);
    } catch (learnError) {
      setError(learnError instanceof Error ? learnError.message : "学习范文失败，请重试。");
    } finally {
      setLearning(false);
    }
  }

  async function handleDeleteArticle(articleId: string) {
    const confirmed = window.confirm("确认删除这条已学范文记录吗？删除后不会回退已学到的词汇和模板。");
    if (!confirmed) return;
    setUpdating(true);
    setError("");
    try {
      if (expandedArticleId === articleId) setExpandedArticleId(null);
      const response = await fetch(`/api/learned/${articleId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "删除已学范文失败，请重试。");
      setSnapshot(result);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除已学范文失败，请重试。");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="space-y-8">
      {toast ? <div className="fixed right-4 top-4 z-20 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div> : null}
      {successMessage ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm"><p className="font-medium text-emerald-900">学习成功</p><p className="mt-1 leading-6">{successMessage}</p></div> : null}

      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">学习新范文</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">风格训练台</h1>
          </div>
          <div className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">已学 {snapshot.counts.learnedCount} 篇</div>
        </div>
        <div className="mb-4 flex w-fit gap-2 rounded-full bg-slate-100 p-1"><button type="button" onClick={() => setActiveTab("text")} className={`rounded-full px-4 py-2 text-sm ${activeTab === "text" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>粘贴文本</button><button type="button" onClick={() => setActiveTab("file")} className={`rounded-full px-4 py-2 text-sm ${activeTab === "file" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>上传文件</button></div>
        {activeTab === "text" ? <textarea rows={10} value={sampleText} onKeyDown={handleKeyDown} onChange={(event) => setSampleText(event.target.value)} placeholder="粘贴一篇你觉得写得好的宣传稿范文……" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 outline-none transition focus:border-slate-400" /> : <div className="space-y-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5"><FileUpload isLoading={analyzing || learning || updating} fileNames={attachment ? [attachment.name] : []} onSelect={handleUpload} onRemove={() => setAttachment(null)} />{attachment ? <div className="rounded-2xl bg-white p-4 text-sm text-slate-600"><p className="font-medium text-slate-900">{attachment.name}</p><p className="mt-2 leading-7">{attachment.content.slice(0, 200)}...</p></div> : <p className="text-sm text-slate-400">上传后会显示文件名和前 200 字预览。</p>}</div>}
        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={handleAnalyze} disabled={analyzing || learning} className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400 sm:w-auto">{analyzing ? "正在研读范文……" : "分析范文"}</button><button type="button" onClick={() => void refreshSnapshot()} disabled={updating} className="w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 sm:w-auto">刷新已学记录</button></div>
      </div>

      {analyzing ? <LoadingBlock /> : analysis ? <AnalysisResult analysis={analysis} existingPhrases={allExistingPhrases} existingExpressions={existingExpressions} onCancel={() => setAnalysis(null)} onConfirm={() => void handleLearn()} isLearning={learning} /> : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">已学范文</h2>
          <p className="mt-1 text-sm text-slate-500">已学 {snapshot.counts.learnedCount} 篇</p>
        </div>
        <div className="space-y-3">
          {snapshot.learnedArticles.length ? snapshot.learnedArticles.map((article) => {
            const expanded = expandedArticleId === article.id;
            return <div key={article.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><button type="button" onClick={() => setExpandedArticleId(expanded ? null : article.id)} className="flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{article.title}</span><span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">{article.material_type}</span></div><p className="mt-2 text-xs text-slate-400">{formatDate(article.created_at)}</p></button><button type="button" onClick={() => void handleDeleteArticle(article.id)} className="text-sm text-slate-400 hover:text-slate-700">删除</button></div>{expanded ? <ArticleAnalysis article={article} /> : null}</div>;
          }) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">还没有已学习的范文记录。</div>}
        </div>
      </div>
    </section>
  );
}
