export default function TrainLoading() {
  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-10 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
}
