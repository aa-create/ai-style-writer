"use client";

type ArticleTextProps = {
  content: string;
  className?: string;
};

function normalizeArticleText(content: string) {
  return content.replace(/\r/g, "").replace(/\*\*(.*?)\*\*/g, "$1").trim();
}

export function ArticleText({ content, className }: ArticleTextProps) {
  const paragraphs = normalizeArticleText(content)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 12)}`} className="text-[15px] leading-8 text-slate-800">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
