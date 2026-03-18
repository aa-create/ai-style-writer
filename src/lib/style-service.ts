import "server-only";

import { callAI } from "@/lib/ai/client";
import {
  defaultGlobalPhrases,
  defaultPropagandaStyleRule,
  defaultSubtitleStyles,
  type MaterialStyleRules,
  type PhraseMap,
  type SubtitleStyle,
} from "@/lib/defaults";
import pool from "@/lib/db";

type GlobalPhrasesRecord = { user_id: string; phrases: PhraseMap };
type LearnAnalysis = {
  title_pattern: string;
  intro_style: string;
  subtitle_format?: SubtitleStyle | null;
  four_char_phrases: string[];
  special_expressions: string[];
  paragraph_style: string;
  best_paragraph: string;
};
type LearnedArticleRow = {
  id: string;
  preview: string;
  material_type: string;
  analysis?: LearnAnalysis | null;
  created_at: string;
};

type StyleRuleRow = {
  rules?: Partial<MaterialStyleRules["rules"]>;
  type_phrases?: PhraseMap;
  subtitle_styles?: SubtitleStyle[];
  style_summary?: string;
  example_paragraphs?: string[];
  stats?: { learned_count?: number };
};

function mergePhraseMaps(...maps: PhraseMap[]) {
  const merged: PhraseMap = {};
  for (const map of maps) {
    for (const [key, values] of Object.entries(map)) {
      merged[key] = Array.from(new Set([...(merged[key] ?? []), ...values]));
    }
  }
  return merged;
}

function normalizeGlobalPhrases(phrases?: PhraseMap) {
  return mergePhraseMaps(defaultGlobalPhrases.phrases, phrases ?? {});
}

function normalizeStyleRules(input?: StyleRuleRow | null): MaterialStyleRules {
  return {
    rules: {
      ...defaultPropagandaStyleRule.rules,
      ...(input?.rules ?? {}),
      title_patterns: [...(input?.rules?.title_patterns ?? [])],
      intro_templates: [...(input?.rules?.intro_templates ?? [])],
      paragraph_patterns: [...(input?.rules?.paragraph_patterns ?? [])],
    },
    type_phrases: mergePhraseMaps(defaultPropagandaStyleRule.type_phrases, input?.type_phrases ?? {}),
    subtitle_styles: [...(input?.subtitle_styles ?? defaultSubtitleStyles)],
    style_summary: input?.style_summary ?? "",
    example_paragraphs: [...(input?.example_paragraphs ?? [])],
    stats: { learned_count: Number(input?.stats?.learned_count ?? 0) },
  };
}

function inferArticleTitle(content: string) {
  const firstLine = content.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? "未命名范文";
  return firstLine.slice(0, 40);
}

function normalizeLearnedArticle(record: LearnedArticleRow) {
  return {
    id: record.id,
    title: inferArticleTitle(record.preview),
    material_type: record.material_type,
    content: record.preview,
    analysis: record.analysis ?? null,
    created_at: record.created_at,
  };
}

function isSimilarPattern(next: string, existing: string) {
  const a = next.trim();
  const b = existing.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const ratio = Math.abs(a.length - b.length) / Math.max(a.length, b.length);
  return ratio < 0.2 && a.slice(0, 10) === b.slice(0, 10);
}

function pushPattern(list: string[], value: string, max: number) {
  const next = value.trim();
  if (!next || list.some((item) => isSimilarPattern(next, item))) return { list, added: false };
  return { list: [...list, next].slice(-max), added: true };
}

function pushUnique<T>(list: T[], value: T, isSame: (left: T, right: T) => boolean, max?: number) {
  if (list.some((item) => isSame(item, value))) return { list, added: false };
  const merged = [...list, value];
  return { list: typeof max === "number" ? merged.slice(-max) : merged, added: true };
}

function countAllPhrases(phrases: PhraseMap) {
  return Object.entries(phrases)
    .filter(([key]) => key !== "特殊表达")
    .reduce((total, [, values]) => total + values.length, 0);
}

async function updateStyleRuleRecord(userId: string, materialType: string, styleRules: MaterialStyleRules) {
  const result = await pool.query(
    `update style_rules
        set rules = $1::jsonb,
            type_phrases = $2::jsonb,
            subtitle_styles = $3::jsonb,
            style_summary = $4,
            example_paragraphs = $5::jsonb,
            stats = $6::jsonb,
            updated_at = now()
      where user_id = $7 and material_type = $8
      returning rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats`,
    [
      JSON.stringify(styleRules.rules),
      JSON.stringify(styleRules.type_phrases),
      JSON.stringify(styleRules.subtitle_styles),
      styleRules.style_summary,
      JSON.stringify(styleRules.example_paragraphs),
      JSON.stringify(styleRules.stats),
      userId,
      materialType,
    ],
  );
  if (result.rows.length === 0) throw new Error("更新类型规则失败：未找到对应记录。");
  return normalizeStyleRules(result.rows[0] as StyleRuleRow);
}

export async function getOrCreateUserData(userId: string) {
  await pool.query(
    `insert into user_global_phrases (user_id, phrases)
     values ($1, $2::jsonb)
     on conflict (user_id) do nothing`,
    [userId, JSON.stringify(defaultGlobalPhrases.phrases)],
  );

  await pool.query(
    `insert into style_rules (
        user_id, material_type, rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats
      ) values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb)
      on conflict (user_id, material_type) do nothing`,
    [
      userId,
      "propaganda",
      JSON.stringify(defaultPropagandaStyleRule.rules),
      JSON.stringify(defaultPropagandaStyleRule.type_phrases),
      JSON.stringify(defaultPropagandaStyleRule.subtitle_styles),
      defaultPropagandaStyleRule.style_summary,
      JSON.stringify(defaultPropagandaStyleRule.example_paragraphs),
      JSON.stringify(defaultPropagandaStyleRule.stats),
    ],
  );
}

export async function getGlobalPhrases(userId: string) {
  await getOrCreateUserData(userId);
  const result = await pool.query("select phrases from user_global_phrases where user_id = $1 limit 1", [userId]);
  const data = result.rows[0] as GlobalPhrasesRecord | undefined;
  if (!data) throw new Error("读取全局词汇失败：未找到记录。");
  return { phrases: normalizeGlobalPhrases(data.phrases) };
}

export async function getStyleRules(userId: string, materialType: string) {
  await getOrCreateUserData(userId);
  const result = await pool.query(
    `select rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats
       from style_rules where user_id = $1 and material_type = $2 limit 1`,
    [userId, materialType],
  );
  if (result.rows.length === 0) throw new Error("读取类型规则失败：未找到记录。");
  return normalizeStyleRules(result.rows[0] as StyleRuleRow);
}

export async function getMergedPhrases(userId: string, materialType: string) {
  const [globalData, styleData] = await Promise.all([getGlobalPhrases(userId), getStyleRules(userId, materialType)]);
  return { phrases: mergePhraseMaps(globalData.phrases, styleData.type_phrases) };
}

export async function replaceGlobalPhrases(userId: string, phrases: PhraseMap) {
  const normalized = normalizeGlobalPhrases(phrases);
  const result = await pool.query(
    `update user_global_phrases
        set phrases = $1::jsonb, updated_at = now()
      where user_id = $2
      returning phrases`,
    [JSON.stringify(normalized), userId],
  );
  if (result.rows.length === 0) throw new Error("覆盖全局词汇失败：未找到记录。");
  return { phrases: normalizeGlobalPhrases((result.rows[0] as { phrases: PhraseMap }).phrases) };
}

export async function updateStyleRules(userId: string, materialType: string, updates: Partial<MaterialStyleRules>) {
  const current = await getStyleRules(userId, materialType);
  const payload = normalizeStyleRules({
    ...current,
    ...updates,
    rules: { ...current.rules, ...(updates.rules ?? {}) },
    type_phrases: updates.type_phrases ? mergePhraseMaps(current.type_phrases, updates.type_phrases) : current.type_phrases,
    subtitle_styles: updates.subtitle_styles ?? current.subtitle_styles,
    example_paragraphs: updates.example_paragraphs ?? current.example_paragraphs,
    stats: { ...current.stats, ...(updates.stats ?? {}) },
  });
  return updateStyleRuleRecord(userId, materialType, payload);
}

export async function saveGenerationHistory(userId: string, materialType: string, rawInput: string, finalOutput: string) {
  await pool.query(
    `insert into generations (user_id, material_type, raw_input, output)
     values ($1, $2, $3, $4)`,
    [userId, materialType, rawInput, finalOutput],
  );
}

export async function getLearnedArticles(userId: string, materialType: string) {
  const result = await pool.query(
    `select id, preview, material_type, analysis, created_at
       from learned_articles
      where user_id = $1 and material_type = $2
      order by created_at desc`,
    [userId, materialType],
  );
  return result.rows.map((row) => normalizeLearnedArticle(row as LearnedArticleRow));
}

export async function saveLearnedArticle(userId: string, materialType: string, content: string, analysis: LearnAnalysis) {
  const preview = content.replace(/\s+/g, " ").trim().slice(0, 200);
  await pool.query(
    `insert into learned_articles (user_id, material_type, preview, analysis)
     values ($1, $2, $3, $4::jsonb)`,
    [userId, materialType, preview, JSON.stringify(analysis)],
  );
}

export async function deleteLearnedArticle(userId: string, articleId: string) {
  const articleResult = await pool.query(
    "select material_type from learned_articles where user_id = $1 and id = $2 limit 1",
    [userId, articleId],
  );
  const materialType = (articleResult.rows[0] as { material_type?: string } | undefined)?.material_type;

  await pool.query("delete from learned_articles where user_id = $1 and id = $2", [userId, articleId]);

  if (materialType) {
    const learnedArticles = await getLearnedArticles(userId, materialType);
    const styleData = await getStyleRules(userId, materialType);
    await updateStyleRuleRecord(userId, materialType, {
      ...styleData,
      stats: { learned_count: learnedArticles.length },
    });
  }
}

export async function addCustomPhrase(userId: string, phrase: string) {
  const current = await getGlobalPhrases(userId);
  return replaceGlobalPhrases(userId, { ...current.phrases, 自定义: Array.from(new Set([...(current.phrases.自定义 ?? []), phrase])).filter(Boolean) });
}

export async function removeCustomPhrase(userId: string, phrase: string) {
  const current = await getGlobalPhrases(userId);
  return replaceGlobalPhrases(userId, { ...current.phrases, 自定义: (current.phrases.自定义 ?? []).filter((item) => item !== phrase) });
}

export async function removeSpecialExpression(userId: string, expression: string) {
  const current = await getGlobalPhrases(userId);
  return replaceGlobalPhrases(userId, { ...current.phrases, 特殊表达: (current.phrases.特殊表达 ?? []).filter((item) => item !== expression) });
}

export async function deleteSubtitleStyle(userId: string, materialType: string, name: string) {
  const current = await getStyleRules(userId, materialType);
  const builtInNames = new Set(defaultSubtitleStyles.map((item) => item.name));
  return updateStyleRuleRecord(userId, materialType, { ...current, subtitle_styles: current.subtitle_styles.filter((item) => builtInNames.has(item.name) || item.name !== name) });
}

export async function deleteExampleParagraph(userId: string, materialType: string, paragraph: string) {
  const current = await getStyleRules(userId, materialType);
  return updateStyleRuleRecord(userId, materialType, { ...current, example_paragraphs: current.example_paragraphs.filter((item) => item !== paragraph) });
}

export async function generateStyleSummaryForUser(userId: string, materialType: string) {
  const [globalData, styleData] = await Promise.all([getGlobalPhrases(userId), getStyleRules(userId, materialType)]);
  const summary = await callAI([
    { role: "system", content: "你是写作风格总结专家。请将以下风格库数据压缩为一份简洁的写作风格指南，300-500字，直接可以作为写作指令使用。包含：标题常用结构、导语习惯、小标题偏好、常用词汇、特色表达、段落展开方式。不要输出 JSON，直接输出纯文本。" },
    { role: "user", content: JSON.stringify({ user_global_phrases: globalData.phrases, style_rules: styleData }, null, 2) },
  ], { temperature: 0.4 });
  await updateStyleRuleRecord(userId, materialType, { ...styleData, style_summary: summary.trim() });
  return true;
}

export async function learnFromAnalysis(userId: string, materialType: string, content: string, analysis: LearnAnalysis) {
  const globalData = await getGlobalPhrases(userId);
  const styleData = await getStyleRules(userId, materialType);
  const allKnownPhrases = new Set(Object.values(globalData.phrases).flat());
  const newPhrases = analysis.four_char_phrases.filter((item) => item && !allKnownPhrases.has(item));
  const newExpressions = analysis.special_expressions.filter((item) => item && !(globalData.phrases.特殊表达 ?? []).includes(item));
  const nextGlobal = normalizeGlobalPhrases({
    ...globalData.phrases,
    自定义: Array.from(new Set([...(globalData.phrases.自定义 ?? []), ...newPhrases])),
    特殊表达: Array.from(new Set([...(globalData.phrases.特殊表达 ?? []), ...newExpressions])),
  });
  await replaceGlobalPhrases(userId, nextGlobal);

  let newPatternsCount = 0;
  const nextStyle = { ...styleData, rules: { ...styleData.rules }, subtitle_styles: [...styleData.subtitle_styles], example_paragraphs: [...styleData.example_paragraphs] };
  if (analysis.subtitle_format?.name && analysis.subtitle_format.pattern) {
    const pushed = pushUnique(nextStyle.subtitle_styles, analysis.subtitle_format, (a, b) => a.name === b.name);
    nextStyle.subtitle_styles = pushed.list;
    if (pushed.added) newPatternsCount += 1;
  }
  const titlePush = pushPattern(nextStyle.rules.title_patterns, analysis.title_pattern, 5); nextStyle.rules.title_patterns = titlePush.list; if (titlePush.added) newPatternsCount += 1;
  const introPush = pushPattern(nextStyle.rules.intro_templates, analysis.intro_style, 5); nextStyle.rules.intro_templates = introPush.list; if (introPush.added) newPatternsCount += 1;
  const paraPush = pushPattern(nextStyle.rules.paragraph_patterns, analysis.paragraph_style, 5); nextStyle.rules.paragraph_patterns = paraPush.list; if (paraPush.added) newPatternsCount += 1;
  const paraSample = analysis.best_paragraph.trim();
  if (paraSample) nextStyle.example_paragraphs = pushUnique(nextStyle.example_paragraphs, paraSample, (a, b) => a === b, 3).list;
  await saveLearnedArticle(userId, materialType, content, analysis);
  const learnedArticles = await getLearnedArticles(userId, materialType);
  nextStyle.stats = { learned_count: learnedArticles.length };
  await updateStyleRuleRecord(userId, materialType, nextStyle);

  let summaryUpdated = false;
  if (nextStyle.stats.learned_count > 0 && nextStyle.stats.learned_count % 5 === 0) {
    summaryUpdated = await generateStyleSummaryForUser(userId, materialType);
  }

  const snapshot = await getStyleLibrarySnapshot(userId, materialType);
  return { newPhraseCount: newPhrases.length, newExpressionsCount: newExpressions.length, newPatternsCount, summaryUpdated, snapshot };
}

export async function getStyleLibrarySnapshot(userId: string, materialType: string) {
  await getOrCreateUserData(userId);
  const [globalData, styleData, learnedArticles] = await Promise.all([
    getGlobalPhrases(userId),
    getStyleRules(userId, materialType),
    getLearnedArticles(userId, materialType),
  ]);
  const learnedCount = learnedArticles.length;
  const snapshotStyleData =
    styleData.stats.learned_count === learnedCount
      ? styleData
      : { ...styleData, stats: { ...styleData.stats, learned_count: learnedCount } };

  return {
    phrases: globalData.phrases,
    learnedArticles,
    styleRules: snapshotStyleData,
    stats: snapshotStyleData.stats,
    counts: {
      learnedCount,
      phraseCount: countAllPhrases(globalData.phrases),
      expressionCount: globalData.phrases.特殊表达?.length ?? 0,
      templateCount: snapshotStyleData.subtitle_styles.length,
    },
  };
}
