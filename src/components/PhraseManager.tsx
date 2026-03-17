"use client";

type PhraseMap = Record<string, string[]>;

type PhraseManagerProps = {
  phrases: PhraseMap;
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (phrase: string) => void;
  busy: boolean;
};

const categories = ["举措", "成效", "政治", "自定义"];

export function PhraseManager({ phrases, draft, onDraftChange, onAdd, onRemove, busy }: PhraseManagerProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">词汇库</h2>
        <p className="mt-1 text-sm text-slate-500">全局词汇会在所有材料类型中共享。</p>
      </div>

      <div className="space-y-5">
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{category}</p>
            <div className="flex flex-wrap gap-2">
              {(phrases[category] ?? []).map((phrase) => (
                <span key={`${category}-${phrase}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {phrase}
                  {category === "自定义" ? <button type="button" onClick={() => onRemove(phrase)} disabled={busy} className="text-slate-400 transition hover:text-slate-700">x</button> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder="添加一个新的四字词" className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400" />
        <button type="button" onClick={onAdd} disabled={busy} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400">添加</button>
      </div>
    </div>
  );
}
