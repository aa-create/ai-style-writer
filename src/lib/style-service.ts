import "server-only";

import { createClient } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai/client";
import {
  defaultGlobalPhrases,
  defaultPropagandaStyleRule,
  defaultSubtitleStyles,
  type MaterialStyleRules,
  type PhraseMap,
  type SubtitleStyle,
} from "@/lib/defaults";

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
type LearnedArticleRecord = {
  id: string;
  title?: string | null;
  material_type: string;
  content: string;
  analysis?: LearnAnalysis | null;
  created_at: string;
};

function getServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("缺少服务端 Supabase 环境变量，请检查 .env.local 配置。");
  return { url, serviceRoleKey };
}

function createServiceClient() {
  const { url, serviceRoleKey } = getServiceEnv();
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

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

function normalizeStyleRules(input?: Partial<MaterialStyleRules> | null): MaterialStyleRules {
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

function normalizeLearnedArticle(record: LearnedArticleRecord) {
  return {
    ...record,
    title: record.title?.trim() || inferArticleTitle(record.content),
    analysis: record.analysis ?? null,
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

function inferArticleTitle(content: string) {
  const firstLine = content.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? "未命名范文";
  return firstLine.slice(0, 40);
}

async function updateStyleRuleRecord(userId: string, materialType: string, styleRules: MaterialStyleRules) {
  const result = await createServiceClient()
    .from("style_rules")
    .update(styleRules)
    .eq("user_id", userId)
    .eq("material_type", materialType)
    .select("rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats")
    .single();
  if (result.error) throw new Error(`更新类型规则失败：${result.error.message}`);
  return normalizeStyleRules(result.data as Partial<MaterialStyleRules>);
}

export async function getOrCreateUserData(userId: string) {
  const supabase = createServiceClient();
  const globalResult = await supabase.from("user_global_phrases").select("user_id, phrases").eq("user_id", userId).maybeSingle<GlobalPhrasesRecord>();
  if (globalResult.error) throw new Error(`读取全局词汇失败：${globalResult.error.message}`);
  if (!globalResult.data) {
    const insertResult = await supabase.from("user_global_phrases").insert({ user_id: userId, phrases: defaultGlobalPhrases.phrases });
    if (insertResult.error) throw new Error(`初始化全局词汇失败：${insertResult.error.message}`);
  }

  const styleResult = await supabase.from("style_rules").select("user_id, material_type, rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats").eq("user_id", userId).eq("material_type", "propaganda").maybeSingle();
  if (styleResult.error) throw new Error(`读取风格规则失败：${styleResult.error.message}`);
  if (!styleResult.data) {
    const insertResult = await supabase.from("style_rules").insert({ user_id: userId, material_type: "propaganda", ...defaultPropagandaStyleRule });
    if (insertResult.error) throw new Error(`初始化风格规则失败：${insertResult.error.message}`);
  }
}

export async function getGlobalPhrases(userId: string) {
  await getOrCreateUserData(userId);
  const result = await createServiceClient().from("user_global_phrases").select("phrases").eq("user_id", userId).single<GlobalPhrasesRecord>();
  if (result.error) throw new Error(`读取全局词汇失败：${result.error.message}`);
  return { phrases: normalizeGlobalPhrases(result.data.phrases) };
}

export async function getStyleRules(userId: string, materialType: string) {
  await getOrCreateUserData(userId);
  const result = await createServiceClient().from("style_rules").select("rules, type_phrases, subtitle_styles, style_summary, example_paragraphs, stats").eq("user_id", userId).eq("material_type", materialType).single();
  if (result.error) throw new Error(`读取类型规则失败：${result.error.message}`);
  return normalizeStyleRules(result.data as Partial<MaterialStyleRules>);
}

export async function getMergedPhrases(userId: string, materialType: string) {
  const [globalData, styleData] = await Promise.all([getGlobalPhrases(userId), getStyleRules(userId, materialType)]);
  return { phrases: mergePhraseMaps(globalData.phrases, styleData.type_phrases) };
}

export async function replaceGlobalPhrases(userId: string, phrases: PhraseMap) {
  const normalized = normalizeGlobalPhrases(phrases);
  const result = await createServiceClient().from("user_global_phrases").update({ phrases: normalized }).eq("user_id", userId).select("phrases").single<GlobalPhrasesRecord>();
  if (result.error) throw new Error(`覆盖全局词汇失败：${result.error.message}`);
  return { phrases: normalizeGlobalPhrases(result.data.phrases) };
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

export async function saveGenerationHistory(
  userId: string,
  materialType: string,
  rawInput: string,
  finalOutput: string,
) {
  const result = await createServiceClient().from("generations").insert({
    user_id: userId,
    material_type: materialType,
    raw_input: rawInput,
    output: finalOutput,
    extracted_points: null,
    style_used: null,
    content: finalOutput,
  });
  if (result.error) throw new Error(`保存生成记录失败：${result.error.message}`);
}

export async function getLearnedArticles(userId: string, materialType: string) {
  const result = await createServiceClient().from("learned_articles").select("id, title, material_type, content, analysis, created_at").eq("user_id", userId).eq("material_type", materialType).order("created_at", { ascending: false }).returns<LearnedArticleRecord[]>();
  if (result.error) throw new Error(`读取已学范文失败：${result.error.message}`);
  return (result.data ?? []).map(normalizeLearnedArticle);
}

export async function saveLearnedArticle(userId: string, materialType: string, content: string, analysis: LearnAnalysis) {
  const preview = content.replace(/\s+/g, " ").trim().slice(0, 80);
  const result = await createServiceClient().from("learned_articles").insert({ user_id: userId, title: inferArticleTitle(content), preview, material_type: materialType, content, analysis });
  if (result.error) throw new Error(`保存已学范文失败：${result.error.message}`);
}

export async function deleteLearnedArticle(userId: string, articleId: string) {
  const supabase = createServiceClient();
  const articleResult = await supabase.from("learned_articles").select("material_type").eq("user_id", userId).eq("id", articleId).maybeSingle<{ material_type: string }>();
  if (articleResult.error) throw new Error(`读取已学范文失败：${articleResult.error.message}`);
  const materialType = articleResult.data?.material_type;

  const result = await supabase.from("learned_articles").delete().eq("user_id", userId).eq("id", articleId);
  if (result.error) throw new Error(`删除已学范文失败：${result.error.message}`);

  if (materialType) {
    const [styleData, learnedArticles] = await Promise.all([
      getStyleRules(userId, materialType),
      getLearnedArticles(userId, materialType),
    ]);
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
